
import json
from PIL import Image
import numpy as np
def m(a,b):
    A=np.asarray(Image.open(a).convert('RGB'),float); B=np.asarray(Image.open(b).convert('RGB'),float)
    d=np.abs(A-B).max(axis=2)
    return {'gt8':round(100*float((d>8).mean()),4),'gt32':round(100*float((d>32).mean()),4),'mae':round(float(d.mean()),4)}
print(json.dumps({'baseline':m('/home/user/Kerja-Arena/verification/step2/390x844/live-strong.png','/home/user/Kerja-Arena/verification/step2/390x844/live2-strong.png'),'rebuild':m('/home/user/Kerja-Arena/verification/step2/390x844/build-strong.png','/home/user/Kerja-Arena/verification/step2/390x844/live-strong.png')}))
