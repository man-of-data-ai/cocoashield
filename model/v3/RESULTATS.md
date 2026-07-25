# CocoaShield — Résultats entraînement v3 (EMA + optimisations)

Date : 2026-07-18
Kernel Kaggle : amadouaz/cocoashield-training-v3-ema-optimisations (version 6)
Dataset : amadouaz/cocoashield-cssvd-dataset (Train 7813 / Val 1954 / Test 2442)
Même architecture que v2 (MobileNetV3-Large, timm) pour rester comparable.

## Changements vs v2

1. **EMA (Exponential Moving Average)** des poids — modèle EMA utilisé pour l'évaluation,
   le monitoring Grad-CAM et la sauvegarde du meilleur checkpoint.
2. **`persistent_workers=True`**, nombre de workers borné par `os.cpu_count()` réel (4, pas 8).
3. **`CornerCutout` réécrit en tensor pur** (plus de PIL↔NumPy par image).
4. **Early stopping (patience=10)** basé sur l'AUC EMA-lissé.
5. **Dataset path auto-détecté** (le montage Kaggle a changé de convention entre les deux runs :
   `/kaggle/input/datasets/<owner>/<dataset>/` au lieu de `/kaggle/input/<dataset>/` — corrigé en
   v3 avec une auto-détection multi-candidats au lieu d'un chemin en dur).

Architecture, résolution (260px), batch size (32) et learning rate **inchangés** vs v2 (reportés
à un test isolé pour ne pas casser la comparabilité, cf. review adversariale).

## Comparaison v2 vs v3 (Test set, 2442 images)

| Métrique | v2 | v3 | Delta |
|---|---|---|---|
| **Test AUC** | 0.9867 | **0.9873** | +0.0006 |
| **Accuracy** | 94% | **95%** | +1 pt |
| cssvd precision | 0.98 | 0.97 | -0.01 |
| cssvd recall | 0.92 | **0.94** | +0.02 |
| healthy precision | 0.89 | **0.92** | +0.03 |
| healthy recall | 0.97 | 0.97 | = |
| Meilleur AUC atteint | 0.9868 (epoch 15) | **0.9873** (epoch 21-22) | — |
| Stabilité epoch-à-epoch | Oscillations visibles (ex: epoch 5 dip) | **Aucune oscillation, progression lisse** | Nette amélioration |
| Early stopping déclenché | N/A (pas implémenté) | Non (30 epochs allées au bout, patience jamais atteinte) | — |

### Matrices de confusion

**v2** :
```
              Predit cssvd   Predit healthy
Reel cssvd         1309            117
Reel healthy          27            989
```

**v3** :
```
              Predit cssvd   Predit healthy
Reel cssvd         1338             88
Reel healthy          35            981
```

v3 réduit les faux négatifs cssvd (117→88, -25%) — le cas le plus critique en usage réel
(maladie non détectée) — au prix d'une légère hausse des faux positifs healthy (27→35).
Compromis globalement favorable pour un outil de détection precoce.

## Vérification anti-biais (Grad-CAM++)

**Ratio d'activation sur les bords (test) : 0.0%** — identique à v2, critère de succès validé.
Le shortcut learning du modèle EfficientNet-B4 initial reste corrigé.

## Effet de l'EMA observé

Contrairement à l'hypothèse initiale (les 7 changements auraient pu être bundlés sans distinction
claire de leur effet), l'EMA a un effet très net et isolable dans les logs : démarrage lent
(AUC=0.75 à l'epoch 1 vs 0.96 en v2, le temps que la moyenne mobile "rattrape" les poids entraînés),
puis rattrapage complet vers l'epoch 6-7, et surtout **zéro oscillation par la suite** — le dip
observé en v2 à l'epoch 5 (val_auc quasi stable mais val_acc -2.7pts) ne se reproduit à aucune
epoch en v3.

## Bugs corrigés pendant ce run (documentés pour référence)

1. **`ManualGradCAMPlusPlus` + modèle EMA gelé** : les paramètres EMA ont `requires_grad=False`
   (volontaire), ce qui cassait le calcul du gradient pour Grad-CAM (`does not require grad`).
   Fix : forcer `requires_grad=True` sur l'**entrée** plutôt que sur les poids du modèle.
2. **Changement de convention de montage dataset Kaggle** entre le run v2 et v3 (ajout d'un niveau
   `datasets/` dans `/kaggle/input/`). Fix : auto-détection multi-candidats au lieu d'un chemin
   codé en dur — rend le notebook résilient à de futurs changements similaires.

## Fichiers dans ce dossier

- `best_model.pt` (17 Mo) — state dict PyTorch (poids EMA du meilleur checkpoint, AUC=0.9873)
- `cocoashield_v3.onnx` (16,8 Mo) — export ONNX
- `cocoashield_v3_scripted.pt` (17,2 Mo) — export TorchScript
- `tflite_export/cocoashield_v3_float32.tflite` (16,8 Mo) — export TFLite (généré directement
  sur Kaggle cette fois, internet disponible après vérification téléphone)
- `history.json` — historique complet des 30 epochs
- `training.log` — log brut complet du run Kaggle

## À faire ensuite

- Export `.pte` (ExecuTorch) pour l'app React Native, comme fait pour v2 — même procédure locale
  (venv dédié, `export_executorch.py` adaptable depuis `model_v2/`)
- v3 est le modèle recommandé pour la suite (meilleur AUC, meilleure stabilité, moins de faux
  négatifs cssvd) — `model_v2/` reste conservé comme référence de comparaison.
