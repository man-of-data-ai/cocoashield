"""
Extrait les features GAP(960-dim) du backbone MobileNetV3 deja entraine (v3), pour
entrainer rapidement une nouvelle tete compatible CAM classique (GAP -> Linear direct,
sans conv_head/BN/hardswish intermediaires qui empechent le calcul exact du CAM).

Le backbone reste gele (deja entraine dans model_v3/best_model.pt) : on ne fait
qu'un forward pass par image pour mettre les features en cache, pas de retro-propagation
a travers le backbone. Usage sequentiel volontaire (Train puis Val, un a la fois) pour
respecter l'espace disque limite.
"""
import sys
import os
import glob
import torch
import torch.nn.functional as F
import torchvision.transforms as T
import timm
from PIL import Image

IMG_SIZE = 260
V3_CKPT = "/home/amadoukamagate/Documents/Projets_/CocoaShield/model_v3/best_model.pt"
OUT_DIR = os.path.dirname(os.path.abspath(__file__))

split_dir = sys.argv[1]  # ex: /tmp/.../cam_extract/Train
out_prefix = sys.argv[2]  # ex: train

backbone = timm.create_model("mobilenetv3_large_100", pretrained=False, num_classes=1, drop_rate=0.0)
backbone.load_state_dict(torch.load(V3_CKPT, map_location="cpu"))
backbone.eval()
for p in backbone.parameters():
    p.requires_grad_(False)

tf = T.Compose([
    T.Resize((IMG_SIZE, IMG_SIZE)),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

files = []
for cls, label in [("cssvd", 0), ("healthy", 1)]:
    for f in glob.glob(os.path.join(split_dir, cls, "*")):
        if f.lower().endswith((".jpg", ".jpeg", ".png")):
            files.append((f, label))

print(f"{len(files)} images a traiter dans {split_dir}")

features = []
labels = []
BATCH = 32
with torch.no_grad():
    for i in range(0, len(files), BATCH):
        batch = files[i:i + BATCH]
        imgs = torch.stack([tf(Image.open(f).convert("RGB")) for f, _ in batch])
        feats = backbone.forward_features(imgs)  # (B, 960, H, W)
        pooled = F.adaptive_avg_pool2d(feats, 1).flatten(1)  # (B, 960)
        features.append(pooled)
        labels.extend([l for _, l in batch])
        if (i // BATCH) % 20 == 0:
            print(f"  {i}/{len(files)}")

features = torch.cat(features, dim=0)
labels = torch.tensor(labels, dtype=torch.float32)

torch.save(features, os.path.join(OUT_DIR, f"{out_prefix}_features.pt"))
torch.save(labels, os.path.join(OUT_DIR, f"{out_prefix}_labels.pt"))
print(f"Sauvegarde: {out_prefix}_features.pt {features.shape}, {out_prefix}_labels.pt {labels.shape}")
