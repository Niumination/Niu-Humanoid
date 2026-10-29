
import json
from PIL import Image
import numpy as np
def m(a,b):
    A=np.asarray(Image.open(a).convert('RGB'),float); B=np.asarray(Image.open(b).convert('RGB'),float)
    d=np.abs(A-B).max(axis=2)
    return {'gt8':round(100*float((d>8).mean()),4),'gt32':round(100*float((d>32).mean()),4),'mae':round(float(d.mean()),4)}
print(json.dumps({'baseline':m('/home/user/Kerja-Arena/verification/entry/1440x900/live-a.png','/home/user/Kerja-Arena/verification/entry/1440x900/live-b.png'),'rebuild':m('/home/user/Kerja-Arena/verification/entry/1440x900/local.png','/home/user/Kerja-Arena/verification/entry/1440x900/live-c.png')}))
