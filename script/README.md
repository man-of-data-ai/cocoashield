# script/

Export scripts used to turn the trained PyTorch weights in `../model/` into
the ExecuTorch (`.pte`) artifacts bundled by the mobile app. Training itself
runs on Kaggle (see `../model/v3/RESULTATS.md`) — no local training code.

Each script reads its checkpoint from the sibling `../model/<...>/` folder
(via a relative `HERE`-based path) and writes the `.pte` output back there.

## v3/

Exports derived directly from `model/v3/best_model.pt`.

| Script | Output | Purpose |
|---|---|---|
| `export_executorch.py` | `model/v3/cocoashield_v3.pte` | Raw ExecuTorch export, single sigmoid output `[1,1]`. |
| `export_executorch_classifier.py` | `model/v3/cocoashield_v3_classifier.pte` | Re-exports as 2 logits `[1,2]` using the `softmax([z,0]) == sigmoid(z)` trick, so it's compatible with react-native-executorch's `ClassificationModule`. |
| `export_heatmap.py` | `model/v3/cocoashield_v3_heatmap.pte` | Exports a gradient-free spatial activation map (L2 norm of backbone features over a 9x9 grid, flattened to 81 values). Not class-discriminant — a coarse saliency proxy, superseded by the true CAM in `v3_camhead/`. |

## v3_camhead/

Exports for the auxiliary GAP->Linear head trained on top of the frozen v3
backbone, which supports a real class-discriminant CAM.

| Script | Output | Purpose |
|---|---|---|
| `extract_features.py` | `model/v3_camhead/train_features.pt`, `train_labels.pt` | One forward pass per training image through the frozen v3 backbone, caching GAP(960-dim) features so the new head can be trained quickly without rerunning the backbone every epoch. Run this first. |
| `export_classifier.py` | `model/v3_camhead/cocoashield_camhead_classifier.pte` | Exports the camhead classifier, same `softmax([z,0])` trick as v3. |
| `export_cam.py` | `model/v3_camhead/cocoashield_camhead_cam.pte` | Exports the true CAM (Zhou et al. 2016): `ReLU(sum_k -w_k * f_k(x,y))`, flattened to a 9x9 grid. This is what renders the disease heatmap overlay in the app. |
| `generate_cam_visualization.py` | `model/v3_camhead/cam_result_*.png` | Local-only sanity check: renders the CAM over a sample image before trusting the exported `.pte`. Not run on-device. |
| `majority_vote.py` | — | Standalone test-time augmentation utility (5 passes with random crop/flip, majority vote). Useful for manually re-checking borderline predictions; not part of the export pipeline. |

## Which exports actually ship in the app?

The mobile app bundles `cocoashield_camhead_classifier.pte` and
`cocoashield_camhead_cam.pte` (both from `v3_camhead/`) — see
`../model/README.md` for the full breakdown.
