# model/

Trained weights and exported artifacts for CocoaShield's CSSVD detection model
(v3, MobileNetV3-Large backbone). No source code here — export scripts that
produced these files live in `../script/`.

## v3/

Main classifier: healthy vs. cssvd (cacao swollen shoot virus disease).
See `RESULTATS.md` for training details, metrics, and comparison with v2.

| File | Purpose |
|---|---|
| `best_model.pt` | PyTorch state dict, EMA weights of the best checkpoint (AUC 0.9873). Source of truth — every export below is derived from it. |
| `cocoashield_v3.onnx` | ONNX export. |
| `cocoashield_v3_scripted.pt` | TorchScript export. |
| `cocoashield_v3.pte` | ExecuTorch export, raw sigmoid output `[1,1]`, produced by `script/v3/export_executorch.py`. |
| `cocoashield_v3_classifier.pte` | ExecuTorch export re-shaped to 2 logits `[1,2]` (softmax-compatible with react-native-executorch's `ClassificationModule`), produced by `script/v3/export_executorch_classifier.py`. **This is the file actually used by the mobile app's classifier.** |
| `cocoashield_v3_heatmap.pte` | ExecuTorch export of a gradient-free spatial activation map (9x9 grid, flattened to 81 "classes"), produced by `script/v3/export_heatmap.py`. Not a true class-discriminant Grad-CAM — see `v3_camhead/` for that. |
| `tflite_export/cocoashield_v3_float32.tflite` | TFLite export. |
| `history.json` | Full training history (30 epochs). |
| `training.log` | Raw Kaggle training run log. |
| `RESULTATS.md` | Training write-up: methodology, metrics, bias checks. |

## v3_camhead/

A separate, simplified classification head (GAP -> Linear, no `conv_head`)
trained on top of the frozen v3 backbone, so that a real class-discriminant
CAM (Zhou et al. 2016) can be computed on-device without backpropagation.

| File | Purpose |
|---|---|
| `train_features.pt` / `train_labels.pt` | Cached GAP(960-dim) backbone features and labels, extracted once by `script/v3_camhead/extract_features.py` so the new head can be trained quickly without re-running the (frozen) backbone each epoch. |
| `camhead_only.pt` | Weights of just the new GAP->Linear head. |
| `camhead_model.pt` | Full model (frozen v3 backbone + camhead), state dict. |
| `camhead_history.json` | Training history of the camhead. |
| `cocoashield_camhead_classifier.pte` | ExecuTorch export of the camhead classifier (same softmax `[z,0]` trick as v3), produced by `script/v3_camhead/export_classifier.py`. **Used by the mobile app's classifier alongside/instead of `v3/cocoashield_v3_classifier.pte`.** |
| `cocoashield_camhead_cam.pte` | ExecuTorch export of the true CAM (`ReLU(sum_k -w_k * f_k(x,y))`, 9x9 grid), produced by `script/v3_camhead/export_cam.py`. **Used by the mobile app to render the disease heatmap overlay.** |
| `cam_result_*.png` | Example CAM visualizations generated locally with `script/v3_camhead/generate_cam_visualization.py`, for manual sanity-checking before export. |

## Which files does the app actually ship?

The mobile app (`../mobile/assets/model/`) bundles the camhead pair:
`cocoashield_camhead_classifier.pte` and `cocoashield_camhead_cam.pte` — these
give both a classification and a real, class-discriminant heatmap. The plain
`v3/` exports are kept as the reference/source model and for the
gradient-free heatmap fallback (`cocoashield_v3_heatmap.pte`).
