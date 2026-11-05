#!/usr/bin/env python3
"""
SPDI - make_video.py
Composite damaged-box images onto a conveyor video that only contains good boxes,
so CiRA CORE has both classes to detect during the demo.

Example (Windows, from the spdi/ folder):
    py -m pip install -r tools/requirements.txt
    py tools/make_video.py --input conveyor_good.mp4 --images damaged --output conveyor_mixed.mp4

Images: put .png (transparent background = best) or .jpg files into the --images folder.
"""
import argparse
import glob
import os
import random
import sys

import cv2
import numpy as np

IMG_EXTS = (".png", ".jpg", ".jpeg", ".bmp", ".webp")


def parse_args():
    p = argparse.ArgumentParser(description="Composite damaged boxes onto a conveyor video.")
    p.add_argument("--input", required=True, help="input video with good boxes (e.g. conveyor_good.mp4)")
    p.add_argument("--images", required=True, help="folder of damaged-box images (png with alpha or jpg)")
    p.add_argument("--output", default="conveyor_mixed.mp4", help="output video path (default conveyor_mixed.mp4)")
    p.add_argument("--box-height", type=float, default=0.28,
                   help="damaged box height as a ratio of frame height (default 0.28)")
    p.add_argument("--belt-y", type=float, default=0.55,
                   help="vertical center of the belt as a ratio of frame height (default 0.55)")
    p.add_argument("--cross-seconds", type=float, default=4.0,
                   help="seconds for a box to cross the whole frame (default 4.0) - match your belt speed")
    p.add_argument("--spawn-seconds", type=float, default=5.0,
                   help="spawn a damaged box every N seconds (default 5.0)")
    p.add_argument("--first-spawn", type=float, default=1.0,
                   help="seconds before the first damaged box appears (default 1.0)")
    p.add_argument("--direction", choices=["ltr", "rtl"], default="ltr",
                   help="belt direction: ltr = left->right (default), rtl = right->left")
    p.add_argument("--duration", type=float, default=None,
                   help="output length in seconds; loops the input video if longer (default = input length)")
    p.add_argument("--jitter", type=float, default=0.03,
                   help="random vertical jitter as ratio of frame height (default 0.03)")
    p.add_argument("--seed", type=int, default=42, help="random seed for repeatable output (default 42)")
    return p.parse_args()


def read_image(path):
    """cv2.imread fails on non-ASCII (e.g. Thai) paths on Windows, so decode from bytes."""
    data = np.fromfile(path, dtype=np.uint8)
    if data.size == 0:
        return None
    return cv2.imdecode(data, cv2.IMREAD_UNCHANGED)


def to_bgra(img):
    if img.ndim == 2:
        return cv2.cvtColor(img, cv2.COLOR_GRAY2BGRA)
    if img.shape[2] == 3:
        alpha = np.full(img.shape[:2], 255, dtype=np.uint8)
        return np.dstack([img, alpha])
    if img.shape[2] == 4:
        return img
    raise ValueError("unsupported channel count: %d" % img.shape[2])


def load_sprites(folder):
    if not os.path.isdir(folder):
        sys.exit("ERROR: images folder not found: %s" % folder)
    paths = sorted(p for p in glob.glob(os.path.join(folder, "*")) if p.lower().endswith(IMG_EXTS))
    sprites = []
    for path in paths:
        img = read_image(path)
        if img is None:
            print("WARN: cannot read %s - skipped" % path)
            continue
        if img.dtype != np.uint8:
            img = cv2.normalize(img, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        sprites.append((os.path.basename(path), to_bgra(img)))
    if not sprites:
        sys.exit("ERROR: no usable images (%s) in %s" % (", ".join(IMG_EXTS), folder))
    return sprites


def scale_to_height(sprite, target_h):
    h, w = sprite.shape[:2]
    target_h = max(4, int(target_h))
    target_w = max(4, int(round(w * target_h / float(h))))
    interp = cv2.INTER_AREA if target_h < h else cv2.INTER_LINEAR
    return cv2.resize(sprite, (target_w, target_h), interpolation=interp)


def overlay(frame, sprite, x, y):
    """Alpha-blend a BGRA sprite onto a BGR frame at top-left (x, y), clipped to the frame."""
    fh, fw = frame.shape[:2]
    sh, sw = sprite.shape[:2]
    x, y = int(round(x)), int(round(y))
    x0, y0 = max(x, 0), max(y, 0)
    x1, y1 = min(x + sw, fw), min(y + sh, fh)
    if x0 >= x1 or y0 >= y1:
        return
    sx0, sy0 = x0 - x, y0 - y
    sx1, sy1 = sx0 + (x1 - x0), sy0 + (y1 - y0)
    patch = sprite[sy0:sy1, sx0:sx1]
    alpha = patch[:, :, 3:4].astype(np.float32) / 255.0
    roi = frame[y0:y1, x0:x1].astype(np.float32)
    blended = patch[:, :, :3].astype(np.float32) * alpha + roi * (1.0 - alpha)
    frame[y0:y1, x0:x1] = blended.astype(np.uint8)


def draw_shadow(frame, x, y, w, h):
    """Soft dark ellipse under the box so it looks like it sits on the belt."""
    fh, fw = frame.shape[:2]
    cx, cy = int(x + w / 2), int(y + h * 0.97)
    axes = (max(2, int(w * 0.48)), max(2, int(h * 0.08)))
    if cx + axes[0] < 0 or cx - axes[0] >= fw or cy - axes[1] >= fh or cy + axes[1] < 0:
        return
    overlay_img = frame.copy()
    cv2.ellipse(overlay_img, (cx, cy), axes, 0, 0, 360, (0, 0, 0), -1)
    cv2.addWeighted(overlay_img, 0.35, frame, 0.65, 0, dst=frame)


def main():
    args = parse_args()
    random.seed(args.seed)

    sprites = load_sprites(args.images)
    print("Loaded %d damaged image(s): %s" % (len(sprites), ", ".join(n for n, _ in sprites)))

    cap = cv2.VideoCapture(args.input)
    if not cap.isOpened():
        sys.exit("ERROR: cannot open input video: %s" % args.input)

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    if fps <= 1 or fps > 240:
        fps = 30.0
    fw = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    fh = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    in_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
    if fw <= 0 or fh <= 0:
        sys.exit("ERROR: invalid video size")

    if args.duration is not None:
        total = int(args.duration * fps)
    elif in_frames > 0:
        total = in_frames
    else:
        total = int(30 * fps)
    print("Input: %dx%d @ %.2f fps, %d frames -> output %d frames (%.1f s)"
          % (fw, fh, fps, in_frames, total, total / fps))

    out_dir = os.path.dirname(os.path.abspath(args.output))
    os.makedirs(out_dir, exist_ok=True)
    writer = cv2.VideoWriter(args.output, cv2.VideoWriter_fourcc(*"mp4v"), fps, (fw, fh))
    if not writer.isOpened():
        sys.exit("ERROR: cannot create output video: %s" % args.output)

    base_h = args.box_height * fh
    spawn_every = max(1, int(round(args.spawn_seconds * fps)))
    next_spawn = int(round(args.first_spawn * fps))
    ltr = args.direction == "ltr"
    active = []
    spawned = 0
    frame_idx = 0

    while frame_idx < total:
        ok, frame = cap.read()
        if not ok:
            # loop the input video when the requested duration is longer
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ok, frame = cap.read()
            if not ok:
                break

        if frame_idx >= next_spawn:
            name, src = random.choice(sprites)
            sprite = scale_to_height(src, base_h * random.uniform(0.9, 1.1))
            if random.random() < 0.5:
                sprite = cv2.flip(sprite, 1)
            sh, sw = sprite.shape[:2]
            y = args.belt_y * fh - sh / 2.0 + random.uniform(-args.jitter, args.jitter) * fh
            x = -float(sw) if ltr else float(fw)
            speed = (fw + sw) / (args.cross_seconds * fps)  # px per frame
            active.append({"img": sprite, "x": x, "y": y, "v": speed if ltr else -speed})
            spawned += 1
            next_spawn += spawn_every

        still = []
        for b in active:
            b["x"] += b["v"]
            sh, sw = b["img"].shape[:2]
            if b["x"] > fw or b["x"] + sw < 0:
                continue  # left the frame
            draw_shadow(frame, b["x"], b["y"], sw, sh)
            overlay(frame, b["img"], b["x"], b["y"])
            still.append(b)
        active = still

        writer.write(frame)
        frame_idx += 1
        if frame_idx % int(fps * 5) == 0:
            print("  %5.1f%%  (%d/%d frames, %d damaged boxes)" % (100.0 * frame_idx / total, frame_idx, total, spawned))

    cap.release()
    writer.release()
    print("Done: %s  (%d frames, %d damaged boxes added)" % (args.output, frame_idx, spawned))


if __name__ == "__main__":
    main()
