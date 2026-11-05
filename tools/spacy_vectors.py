import json, struct, numpy as np
V='md/pt_core_news_md/pt_core_news_md-3.8.0/vocab/'
def read_k2r():
    b=open(V+'key2row','rb').read(); assert b[0]==0xdf
    n=struct.unpack('>I',b[1:5])[0]; i=5; out={}
    def rd(i):
        t=b[i]
        if t<=0x7f: return t,i+1
        if t==0xcc: return b[i+1],i+2
        if t==0xcd: return struct.unpack('>H',b[i+1:i+3])[0],i+3
        if t==0xce: return struct.unpack('>I',b[i+1:i+5])[0],i+5
        if t==0xcf: return struct.unpack('>Q',b[i+1:i+9])[0],i+9
        raise Exception(hex(t))
    for _ in range(n):
        k,i=rd(i); v,i=rd(i); out[k]=v
    return out
M=0xc6a4a7935bd1e995; MASK=(1<<64)-1
def mm64a(data, seed=1):
    r=47; l=len(data); h=(seed ^ (l*M)) & MASK
    nb=l//8
    for j in range(nb):
        k=struct.unpack('<Q',data[j*8:j*8+8])[0]
        k=(k*M)&MASK; k^=k>>r; k=(k*M)&MASK
        h^=k; h=(h*M)&MASK
    tail=data[nb*8:]; rem=l&7
    if rem:
        for j in range(rem-1,-1,-1): h^=tail[j]<<(8*j)
        h=(h*M)&MASK
    h^=h>>r; h=(h*M)&MASK; h^=h>>r
    return h
def load():
    k2r=read_k2r(); strings=json.load(open(V+'strings.json'))
    vec=np.load(V+'vectors')
    return k2r,strings,vec
if __name__=='__main__':
    k2r,strings,vec=load()
    hits=0; words=[]
    for s in strings:
        h=mm64a(s.encode('utf8'))
        if h in k2r: hits+=1; words.append(s)
    print('strings',len(strings),'with vector',hits, vec.shape)
    print(words[:40])
