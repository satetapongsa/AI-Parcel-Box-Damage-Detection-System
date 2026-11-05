// ============================================================
// SPDI - code for CiRA CORE "JavaScript" node
// Flow: ButtonRun -> VideoFile -> DeepDetect -> Debug -> [THIS NODE] -> MqttPub
//
// Input : `payload` coming from the DeepDetect node
// Output: `payload` = { type:"frame", device:"cira-01", ts, objects:[{name,conf,x,y,w,h}] }
//
// ES5 only (var, for loops) - CiRA's JS engine may not support let/const/arrow functions.
// ============================================================

// 1) Pick the detection result.
//    GPU version uses payload.DeepDetect ; CPU version uses payload.DeepDetectCPU.
//    To force CPU, change the line below to:  var dd = payload.DeepDetectCPU;
var dd = payload.DeepDetect;

// Automatic fallback: if DeepDetect is missing, try DeepDetectCPU.
if (!dd && payload.DeepDetectCPU) {
  dd = payload.DeepDetectCPU;
}

var objs = (dd && dd.objects) ? dd.objects : [];
var out = [];

// Image size reported by DeepDetect (e.g. 1920 x 1080). Used to convert
// pixel coordinates to 0-1, so the bridge does not need FRAME_W / FRAME_H.
var imW = (dd && dd.im_w) ? Number(dd.im_w) : 0;
var imH = (dd && dd.im_h) ? Number(dd.im_h) : 0;

// 2) Map every detection to a small, stable shape.
for (var i = 0; i < objs.length; i++) {
  var o = objs[i];
  var name = o.name;
  if (name === undefined || name === null) { name = o.label; }
  if (name === undefined || name === null) { name = o["class"]; }

  var conf = o.confidence;
  if (conf === undefined || conf === null) { conf = o.conf; }
  if (conf === undefined || conf === null) { conf = o.score; }
  if (conf === undefined || conf === null) { conf = 1; }

  var w = (o.w !== undefined) ? o.w : o.width;
  var h = (o.h !== undefined) ? o.h : o.height;

  var x = Number(o.x);
  var y = Number(o.y);
  w = Number(w);
  h = Number(h);
  if (imW > 0 && imH > 0) {
    x = x / imW;
    y = y / imH;
    w = w / imW;
    h = h / imH;
  }

  out.push({
    name: String(name),
    conf: Number(conf),
    x: x,
    y: y,
    w: w,
    h: h
  });
}

// 3) Replace payload with the message the MqttPub node will send.
//    The bridge counts each box once, so sending every frame is fine.
payload = {
  type: "frame",
  device: "cira-01",
  ts: new Date().getTime(),
  objects: out
};
