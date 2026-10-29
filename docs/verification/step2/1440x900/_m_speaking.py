
import json
from PIL import Image
import numpy as np
def m(a,b):
    A=np.asarray(Image.open(a).convert('RGB'),float); B=np.asarray(Image.open(b).convert('RGB'),float)
    d=np.abs(A-B).max(axis=2)
    return {'gt8':round(100*float((d>8).mean()),4),'gt32':round(100*float((d>32).mean()),4),'mae':round(float(d.mean()),4)}
print(json.dumps({'baseline':m('/home/user/Kerja-Arena/verification/step2/1440x900/live-speaking.png','/home/user/Kerja-Arena/verification/step2/1440x900/live2-speaking.png'),'rebuild':m('/home/user/Kerja-Arena/verification/step2/1440x900/build-speaking.png','/home/user/Kerja-Arena/verification/step2/1440x900/live-speaking.png')}))
