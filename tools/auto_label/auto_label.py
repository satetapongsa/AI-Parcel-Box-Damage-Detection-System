#!/usr/bin/env python3
"""
SPDI auto-labeler: find parcel boxes in every image of a folder and write one
CiRA CORE label file (<image>.gt) next to each image, ready for DeepTrain.

Detection methods
  ai     (default when installed) YOLO-World: a pretrained open-vocabulary AI detector.
         You tell it what to find ("cardboard box"), no training needed. Most accurate.
  bg     (default for video frames) Background subtraction: the median of all frames of
         the same scene is the empty belt; anything that differs is a box. Works for boxes
         of ANY colour, ignores static things (pallets, watermark). Scene cuts are detected
         automatically and each scene gets its own background.
  color  Brown cardboard colour (HSV) + contours. For single photos / few images.
  yolo   Use a trained darknet model (e.g. CiRA's test.cfg + train.weights + obj.names)
         to pre-label, then fix the mistakes in CiRA.

Examples (run from the spdi folder):
  py tools/auto_label/auto_label.py "C:/Users/PC/Desktop/box_good/dataset_frames" --preview
  py tools/auto_label/auto_label.py FOLDER --roi 0,0.3,1,0.6 --preview
  py tools/auto_label/auto_label.py FOLDER --method yolo --cfg test.cfg --weights train.weights --names obj.names
  py tools/auto_label/auto_label.py FOLDER --convert-text          # old "label x y w h" files -> CiRA JSON
  py tools/auto_label/auto_label.py FOLDER --dry-run --eval FOLDER/_BACKUP.gt   # measure accuracy

CiRA .gt format (JSON, x,y = top-left corner, pixels of the original image):
  [ { "filename": "box_0000.jpg",
      "obj_array": [ { "bbox": "x,y,w,h", "center": "cx,cy", "color": "255,0,255",
                       "label": "box_good", "label_index": 0, "landmark": "", "landmark_len": 0 } ] } ]
"""
import argparse
import glob
import json
import os
import sys

import cv2
import numpy as np

IMG_EXTS = (".jpg", ".jpeg", ".png", ".bmp")
PALETTE = ["255,0,255", "0,255,0", "255,0,0", "0,0,255", "255,255,0", "0,255,255", "255,128,0"]
WORK_W = 640  # detection runs on a resized copy (fast); boxes are scaled back


# ----------------------------------------------------------------------------- io
def read_image(path):
    """cv2.imread fails on non-ASCII (Thai) paths on Windows, so decode from bytes."""
    data = np.fromfile(path, dtype=np.uint8)
    if data.size == 0:
        return None
    return cv2.imdecode(data, cv2.IMREAD_COLOR)


def write_image(path, img):
    ok, buf = cv2.imencode(os.path.splitext(path)[1] or ".jpg", img)
    if ok:
        buf.tofile(path)


def list_images(folder):
    files = [p for p in glob.glob(os.path.join(folder, "*")) if p.lower().endswith(IMG_EXTS)]
    files = [p for p in files if not os.path.basename(p).startswith("_")]
    return sorted(files)


def gt_path_for(img_path):
    return os.path.splitext(img_path)[0] + ".gt"


def make_entry(filename, boxes, class_order):
    """boxes: list of dict(label, x, y, w, h) in original pixels."""
    objs = []
    for b in boxes:
        idx = class_order.index(b["label"]) if b["label"] in class_order else 0
        x, y, w, h = int(b["x"]), int(b["y"]), int(b["w"]), int(b["h"])
        objs.append({
            "bbox": "%d,%d,%d,%d" % (x, y, w, h),
            "center": "%d,%d" % (int(x + w / 2 + 0.5), int(y + h / 2 + 0.5)),
            "color": PALETTE[idx % len(PALETTE)],
            "label": b["label"],
            "label_index": idx,
            "landmark": "",
            "landmark_len": 0,
        })
    return {"filename": filename, "obj_array": objs}


def write_gt(path, entry):
    with open(path, "w", encoding="utf-8") as f:
        json.dump([entry], f, indent=4, ensure_ascii=False)


def parse_gt_file(path):
    """Read a .gt file in CiRA JSON format or the plain 'label x y w h' text format.
    Returns {filename: [box dicts]} ; text files map to the image with the same name."""
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        text = f.read().strip()
    result = {}
    if not text:
        return result
    if text.startswith("["):
        for entry in json.loads(text):
            boxes = []
            for o in entry.get("obj_array", []):
                x, y, w, h = [int(float(v)) for v in str(o.get("bbox", "0,0,0,0")).split(",")[:4]]
                boxes.append({"label": o.get("label", "box"), "x": x, "y": y, "w": w, "h": h})
            result[entry.get("filename", "")] = boxes
        return result
    boxes = []
    for line in text.splitlines():
        parts = line.split()
        if len(parts) >= 5:
            boxes.append({"label": parts[0], "x": int(float(parts[1])), "y": int(float(parts[2])),
                          "w": int(float(parts[3])), "h": int(float(parts[4]))})
    result[None] = boxes  # None = "the image next to this file"
    return result


# -------------------------------------------------------------------------- geometry
def iou(a, b):
    ax2, ay2 = a["x"] + a["w"], a["y"] + a["h"]
    bx2, by2 = b["x"] + b["w"], b["y"] + b["h"]
    iw = max(0, min(ax2, bx2) - max(a["x"], b["x"]))
    ih = max(0, min(ay2, by2) - max(a["y"], b["y"]))
    inter = iw * ih
    union = a["w"] * a["h"] + b["w"] * b["h"] - inter
    return inter / union if union > 0 else 0.0


def parse_roi(text):
    if not text:
        return None
    vals = [float(v) for v in text.split(",")]
    if len(vals) != 4:
        sys.exit("ERROR: --roi needs 4 numbers x,y,w,h (0-1), e.g. 0,0.3,1,0.6")
    return vals


def filter_boxes(boxes, img_w, img_h, args, roi):
    out = []
    area_img = float(img_w * img_h)
    for b in boxes:
        a = b["w"] * b["h"] / area_img
        if a < args.min_area or a > args.max_area:
            continue
        ar = b["w"] / float(max(b["h"], 1))
        if ar < 1 / args.max_aspect or ar > args.max_aspect:
            continue
        if roi:
            cx = (b["x"] + b["w"] / 2.0) / img_w
            cy = (b["y"] + b["h"] / 2.0) / img_h
            if not (roi[0] <= cx <= roi[0] + roi[2] and roi[1] <= cy <= roi[1] + roi[3]):
                continue
        out.append(b)
    # drop boxes that are mostly inside a bigger one
    out.sort(key=lambda b: -b["w"] * b["h"])
    kept = []
    for b in out:
        if all(iou(b, k) < 0.5 for k in kept):
            kept.append(b)
    return kept


def boxes_from_mask(mask, scale, label, pad_frac=0.0):
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if w < 4 or h < 4:
            continue
        fill = cv2.contourArea(c) / float(w * h)
        if fill < 0.45:  # ragged blobs (shadows, noise) are not boxes
            continue
        px, py = int(w * pad_frac), int(h * pad_frac)
        boxes.append({"label": label, "x": (x - px) * scale, "y": (y - py) * scale,
                      "w": (w + 2 * px) * scale, "h": (h + 2 * py) * scale})
    return boxes


def clip_box(b, img_w, img_h):
    x = max(0, min(int(round(b["x"])), img_w - 1))
    y = max(0, min(int(round(b["y"])), img_h - 1))
    x2 = max(x + 1, min(int(round(b["x"] + b["w"])), img_w))
    y2 = max(y + 1, min(int(round(b["y"] + b["h"])), img_h))
    return dict(b, x=x, y=y, w=x2 - x, h=y2 - y)


# -------------------------------------------------------------------------- methods
def small_copy(img):
    h, w = img.shape[:2]
    scale = w / float(WORK_W)
    small = cv2.resize(img, (WORK_W, int(round(h / scale))), interpolation=cv2.INTER_AREA)
    return small, scale


def kernel(size):
    size = max(1, int(size))
    return cv2.getStructuringElement(cv2.MORPH_RECT, (size, size))


def split_scenes(smalls, cut_thr):
    """Group consecutive frames into scenes (a big jump in the image = a camera cut)."""
    scenes, current, prev = [], [], None
    for i, s in enumerate(smalls):
        thumb = cv2.resize(cv2.cvtColor(s, cv2.COLOR_BGR2GRAY), (64, 36), interpolation=cv2.INTER_AREA).astype(np.float32)
        if prev is not None and float(np.mean(np.abs(thumb - prev))) > cut_thr:
            scenes.append(current)
            current = []
        current.append(i)
        prev = thumb
    if current:
        scenes.append(current)
    return scenes


def detect_bg(smalls, scales, sizes, args, roi):
    results = [None] * len(smalls)
    scenes = split_scenes(smalls, args.scene_cut)
    print("Scenes found: %d (sizes: %s)" % (len(scenes), ", ".join(str(len(s)) for s in scenes)))
    for scene in scenes:
        if len(scene) < args.min_scene:
            for i in scene:
                results[i] = detect_color_one(smalls[i], scales[i], sizes[i], args, roi)
            continue
        pick = scene if len(scene) <= 60 else [scene[int(k * (len(scene) - 1) / 59)] for k in range(60)]
        stack = np.stack([smalls[i] for i in pick if smalls[i].shape == smalls[scene[0]].shape])
        background = np.median(stack, axis=0).astype(np.uint8)
        bg_blur = cv2.GaussianBlur(background, (5, 5), 0)
        for i in scene:
            frame = cv2.GaussianBlur(smalls[i], (5, 5), 0)
            if frame.shape != bg_blur.shape:
                results[i] = detect_color_one(smalls[i], scales[i], sizes[i], args, roi)
                continue
            diff = cv2.absdiff(frame, bg_blur).max(axis=2)
            mask = (diff > args.diff).astype(np.uint8) * 255
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel(3))
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel(WORK_W / 64))
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel(WORK_W / 90))
            boxes = boxes_from_mask(mask, scales[i], args.label)
            w, h = sizes[i]
            results[i] = filter_boxes([clip_box(b, w, h) for b in boxes], w, h, args, roi)
    return results


def detect_color_one(small, scale, size, args, roi):
    hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
    lo = np.array([args.hue[0], args.sat_min, args.val_min], np.uint8)
    hi = np.array([args.hue[1], 255, 255], np.uint8)
    mask = cv2.inRange(hsv, lo, hi)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel(3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel(WORK_W / 50))
    boxes = boxes_from_mask(mask, scale, args.label)
    w, h = size
    return filter_boxes([clip_box(b, w, h) for b in boxes], w, h, args, roi)


def load_yolo(args):
    for p in (args.cfg, args.weights):
        if not p or not os.path.isfile(p):
            sys.exit("ERROR: --method yolo needs --cfg and --weights files (CiRA: test.cfg + train.weights)")
    try:
        net = cv2.dnn.readNetFromDarknet(args.cfg, args.weights)
    except Exception as e:  # noqa: BLE001
        sys.exit("ERROR: OpenCV cannot load this darknet model (%s). Use --method bg instead." % e)
    names = []
    if args.names and os.path.isfile(args.names):
        with open(args.names, encoding="utf-8") as f:
            names = [line.strip() for line in f if line.strip()]
    in_w = in_h = 416
    with open(args.cfg, encoding="utf-8", errors="replace") as f:
        for line in f:
            k, _, v = line.partition("=")
            if k.strip() == "width":
                in_w = int(v)
            elif k.strip() == "height":
                in_h = int(v)
    return net, names, (in_w, in_h)


def detect_yolo_one(img, model, args, roi):
    net, names, (in_w, in_h) = model
    h, w = img.shape[:2]
    blob = cv2.dnn.blobFromImage(img, 1 / 255.0, (in_w, in_h), swapRB=True, crop=False)
    net.setInput(blob)
    outs = net.forward(net.getUnconnectedOutLayersNames())
    rects, scores, labels = [], [], []
    for out in outs:
        for row in out.reshape(-1, out.shape[-1]):
            cls_scores = row[5:]
            if cls_scores.size == 0:
                continue
            c = int(np.argmax(cls_scores))
            conf = float(row[4] * cls_scores[c])
            if conf < args.conf:
                continue
            cx, cy, bw, bh = row[0] * w, row[1] * h, row[2] * w, row[3] * h
            rects.append([int(cx - bw / 2), int(cy - bh / 2), int(bw), int(bh)])
            scores.append(conf)
            labels.append(names[c] if c < len(names) else args.label)
    keep = cv2.dnn.NMSBoxes(rects, scores, args.conf, 0.45) if rects else []
    boxes = []
    for k in np.array(keep).reshape(-1):
        x, y, bw, bh = rects[int(k)]
        boxes.append(clip_box({"label": labels[int(k)], "x": x, "y": y, "w": bw, "h": bh}, w, h))
    return filter_boxes(boxes, w, h, args, roi)


def ai_available():
    try:
        import ultralytics  # noqa: F401
        return True
    except Exception:  # noqa: BLE001
        return False


def load_world(args):
    try:
        from ultralytics import YOLOWorld
    except Exception as e:  # noqa: BLE001
        sys.exit("ERROR: --method ai needs PyTorch + Ultralytics (%s). See tools/auto_label/README.md" % e)
    print("Loading YOLO-World model %s (first run downloads it, ~25 MB)..." % args.world_model)
    model = YOLOWorld(args.world_model)
    model.set_classes(list(args.prompt))
    return model


def detect_world_one(img, model, args, roi):
    h, w = img.shape[:2]
    res = model.predict(img, conf=args.ai_conf, iou=0.5, imgsz=args.imgsz, verbose=False)[0]
    boxes = []
    if res.boxes is not None and len(res.boxes):
        xyxy = res.boxes.xyxy.cpu().numpy()
        for x1, y1, x2, y2 in xyxy:
            boxes.append(clip_box({"label": args.label, "x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1}, w, h))
    return filter_boxes(boxes, w, h, args, roi)


# ------------------------------------------------------------------------- actions
def convert_text(folder, class_order):
    n = 0
    for gt in sorted(glob.glob(os.path.join(folder, "*.gt"))):
        if os.path.basename(gt).startswith("_"):
            continue
        with open(gt, encoding="utf-8", errors="replace") as f:
            if f.read(1) == "[":
                continue  # already CiRA JSON
        boxes = parse_gt_file(gt).get(None, [])
        img = next((os.path.splitext(gt)[0] + e for e in IMG_EXTS if os.path.isfile(os.path.splitext(gt)[0] + e)), None)
        if img is None:
            print("  skip %s (no image with the same name)" % os.path.basename(gt))
            continue
        for b in boxes:
            if b["label"] not in class_order:
                class_order.append(b["label"])
        write_gt(gt, make_entry(os.path.basename(img), boxes, class_order))
        n += 1
    print("Converted %d text .gt file(s) to CiRA JSON format. Classes: %s" % (n, ", ".join(class_order)))


def evaluate(predictions, ref_path, folder):
    refs = {}
    if os.path.isdir(ref_path):
        for gt in glob.glob(os.path.join(ref_path, "*.gt")):
            for k, v in parse_gt_file(gt).items():
                name = k if k else os.path.splitext(os.path.basename(gt))[0]
                refs[os.path.splitext(name)[0]] = v
    else:
        for k, v in parse_gt_file(ref_path).items():
            refs[os.path.splitext(k or "")[0]] = v
    tp = fp = fn = 0
    ious = []
    for name, preds in predictions.items():
        key = os.path.splitext(name)[0]
        if key not in refs or not refs[key]:
            continue  # image not labeled in the reference -> cannot judge it
        used = set()
        for p in preds:
            best, best_j = 0.0, -1
            for j, r in enumerate(refs[key]):
                if j in used:
                    continue
                v = iou(p, r)
                if v > best:
                    best, best_j = v, j
            if best >= 0.5:
                tp += 1
                used.add(best_j)
                ious.append(best)
            else:
                fp += 1
        fn += len(refs[key]) - len(used)
    if tp + fp + fn == 0:
        print("Eval: no overlapping images between predictions and %s" % ref_path)
        return
    precision = tp / float(tp + fp) if tp + fp else 0.0
    recall = tp / float(tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    print("Eval vs %s (IoU>=0.5): precision %.1f%%  recall %.1f%%  F1 %.1f%%  mean IoU %.2f  (TP %d, FP %d, FN %d)"
          % (os.path.basename(ref_path), precision * 100, recall * 100, f1 * 100,
             float(np.mean(ious)) if ious else 0.0, tp, fp, fn))


def draw_preview(img, boxes):
    out = img.copy()
    t = max(2, img.shape[1] // 400)
    for b in boxes:
        cv2.rectangle(out, (b["x"], b["y"]), (b["x"] + b["w"], b["y"] + b["h"]), (255, 0, 255), t)
        cv2.putText(out, b["label"], (b["x"], max(20, b["y"] - 8)), cv2.FONT_HERSHEY_SIMPLEX, t * 0.4, (255, 0, 255), t)
    return out


# ---------------------------------------------------------------------------- main
def parse_args():
    p = argparse.ArgumentParser(description="Auto-detect parcel boxes and write CiRA CORE .gt files next to each image.")
    p.add_argument("folder", help="folder with images (.jpg/.png); .gt files are written into the same folder")
    p.add_argument("--method", choices=["auto", "ai", "bg", "color", "yolo"], default="auto",
                   help="auto (default) = ai if Ultralytics is installed, else bg (10+ same-size frames) or color")
    p.add_argument("--prompt", nargs="+", default=["cardboard box", "parcel box", "package"],
                   help='ai: what to look for (default: "cardboard box" "parcel box" "package")')
    p.add_argument("--world-model", default="yolov8s-worldv2.pt", help="ai: YOLO-World weights (s = fast, l = more accurate)")
    p.add_argument("--ai-conf", type=float, default=0.2, help="ai: min confidence (default 0.2)")
    p.add_argument("--imgsz", type=int, default=640, help="ai: inference size (default 640; 960 finds small boxes better)")
    p.add_argument("--label", default="box_good", help="class name for detected boxes (default box_good)")
    p.add_argument("--overwrite", action="store_true", help="replace existing .gt files (default: keep them)")
    p.add_argument("--dry-run", action="store_true", help="detect only, write no .gt files")
    p.add_argument("--preview", action="store_true", help="save images with drawn boxes into <folder>/_preview/")
    p.add_argument("--roi", help="only keep boxes whose center is inside x,y,w,h (0-1), e.g. 0,0.3,1,0.6 = belt area")
    p.add_argument("--min-area", type=float, default=0.004, help="min box area as fraction of image (default 0.004)")
    p.add_argument("--max-area", type=float, default=0.5, help="max box area as fraction of image (default 0.5)")
    p.add_argument("--max-aspect", type=float, default=4.0, help="max width/height ratio (default 4)")
    p.add_argument("--diff", type=int, default=35, help="bg: pixel difference threshold 0-255 (default 35; lower = more sensitive)")
    p.add_argument("--scene-cut", type=float, default=28.0, help="bg: frame jump that counts as a new scene (default 28)")
    p.add_argument("--min-scene", type=int, default=10, help="bg: scenes with fewer frames use the color method (default 10)")
    p.add_argument("--hue", type=int, nargs=2, default=[5, 30], help="color: cardboard hue range 0-180 (default 5 30)")
    p.add_argument("--sat-min", type=int, default=50, help="color: min saturation (default 50)")
    p.add_argument("--val-min", type=int, default=60, help="color: min brightness (default 60)")
    p.add_argument("--cfg", help="yolo: darknet .cfg (CiRA test.cfg)")
    p.add_argument("--weights", help="yolo: darknet .weights (CiRA train.weights)")
    p.add_argument("--names", help="yolo: class names file (CiRA obj.names)")
    p.add_argument("--conf", type=float, default=0.4, help="yolo: min confidence (default 0.4)")
    p.add_argument("--convert-text", action="store_true", help="convert existing 'label x y w h' .gt files to CiRA JSON and exit")
    p.add_argument("--eval", metavar="GT", help="compare detections with reference labels (a CiRA .gt file such as _BACKUP.gt, or a folder)")
    return p.parse_args()


def main():
    args = parse_args()
    folder = os.path.abspath(args.folder)
    if not os.path.isdir(folder):
        sys.exit("ERROR: folder not found: %s" % folder)
    class_order = [args.label]

    if args.convert_text:
        convert_text(folder, class_order)
        return

    paths = list_images(folder)
    if not paths:
        sys.exit("ERROR: no images (%s) in %s" % (", ".join(IMG_EXTS), folder))
    roi = parse_roi(args.roi)
    print("Images: %d in %s" % (len(paths), folder))

    method = args.method
    smalls, scales, sizes, ok_paths = [], [], [], []
    for p in paths:
        img = read_image(p)
        if img is None:
            print("  skip unreadable %s" % os.path.basename(p))
            continue
        s, sc = small_copy(img)
        smalls.append(s)
        scales.append(sc)
        sizes.append((img.shape[1], img.shape[0]))
        ok_paths.append(p)
    if method == "auto":
        same = len(set(sizes)) == 1
        method = "ai" if ai_available() else ("bg" if len(ok_paths) >= 10 and same else "color")
    print("Method: %s" % method)

    if method == "ai":
        model = load_world(args)
        results = []
        for i, p in enumerate(ok_paths):
            results.append(detect_world_one(read_image(p), model, args, roi))
            if (i + 1) % 25 == 0 or i + 1 == len(ok_paths):
                print("  %d/%d" % (i + 1, len(ok_paths)))
    elif method == "bg":
        results = detect_bg(smalls, scales, sizes, args, roi)
    elif method == "color":
        results = [detect_color_one(smalls[i], scales[i], sizes[i], args, roi) for i in range(len(ok_paths))]
    else:
        model = load_yolo(args)
        results = []
        for i, p in enumerate(ok_paths):
            results.append(detect_yolo_one(read_image(p), model, args, roi))
            if (i + 1) % 25 == 0:
                print("  %d/%d" % (i + 1, len(ok_paths)))
        for r in results:
            for b in r:
                if b["label"] not in class_order:
                    class_order.append(b["label"])

    preview_dir = os.path.join(folder, "_preview")
    if args.preview:
        os.makedirs(preview_dir, exist_ok=True)

    written = skipped = total_boxes = empty = 0
    predictions = {}
    for p, boxes in zip(ok_paths, results):
        name = os.path.basename(p)
        predictions[name] = boxes
        total_boxes += len(boxes)
        if not boxes:
            empty += 1
        if args.preview:
            write_image(os.path.join(preview_dir, name), draw_preview(read_image(p), boxes))
        if args.dry_run:
            continue
        gt = gt_path_for(p)
        if os.path.exists(gt) and not args.overwrite:
            skipped += 1
            continue
        write_gt(gt, make_entry(name, boxes, class_order))
        written += 1

    print("")
    print("Boxes found: %d (avg %.1f per image, %d image(s) with no box)" % (total_boxes, total_boxes / float(len(ok_paths)), empty))
    if args.dry_run:
        print("Dry run: no .gt files written")
    else:
        print("Written: %d .gt file(s)   Skipped (already had .gt): %d%s"
              % (written, skipped, "  -> add --overwrite to replace them" if skipped else ""))
    if args.preview:
        print("Preview images: %s" % preview_dir)
    if args.eval:
        evaluate(predictions, args.eval, folder)
    print("Next: open the folder in CiRA DeepTrain > Labeling, check/fix the boxes (relabel damaged ones), then Generate + Train.")


if __name__ == "__main__":
    main()
