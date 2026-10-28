"""Builds data/dev-figures.json and data/dev-boards.json (stand-ins, INVENTED figures)."""
import json, random, os
root = os.path.join(os.path.dirname(__file__), '..', 'data')
q = json.load(open(os.path.join(root, 'dev-questions.json')))
E = [x['id'] for x in q['econ']]; S = [x['id'] for x in q['social']]
rnd = random.Random(7)
def answers(ex, sy, unknown, wobble):
    out = {}
    for ids, target in ((E, ex), (S, sy)):
        for i in ids:
            if rnd.random() < unknown:
                out[i] = {"s": None}; continue
            v = round(max(-2, min(2, target / 5 + rnd.uniform(-wobble, wobble))))
            out[i] = {"s": v, "ev": "Invented sample evidence for a made-up figure; not a real record.", "src": ["https://example.org/sample-source"]}
    return out
F = [
 ("dev-quill","Senator Mara Quill",["Mara Quill","Senator Quill"],"politician","Fictional legislator used to demo the map.",None,[("2010s",-3.8,1.2,.0,.6),("2020s",-1.4,2.8,.0,.6)]),
 ("dev-brandt","Elias Brandt",["Brandt"],"historical","Invented 1800s reformer.",None,[("1840s",-5.5,-2.4,.08,.7),("1870s",-3.0,0.8,.08,.7)]),
 ("dev-vale","Juno Vale",["Vale"],"public","Invented pop star with a few public stances.",None,[("2020s",-2.6,-5.2,.55,1.0)]),
 ("dev-thorne","Captain Oriel Thorne",["Oriel Thorne","Thorne"],"fictional","Invented sci-fi game captain.","Sample Game, original",[("Original game",3.2,6.4,.1,.7),("2026 remake",1.0,4.2,.1,.7)]),
 ("dev-isolde","Queen Isolde of Varn",["Isolde","Queen Isolde"],"fictional","Invented fantasy novel monarch.","Varn novels",[("Novels",4.6,8.2,.05,.5)]),
 ("dev-arlow","Professor Kenji Arlow",["Kenji Arlow","Arlow"],"public","Invented economist.",None,[("2020s",7.4,-3.6,.0,.6)]),
 ("dev-rook","Rook",["Rook"],"fictional","Invented cyberpunk anti-hero.","Sample Neon cycle",[("Season 1",-6.8,-7.4,.2,.8)]),
]
tok = {"dev-thorne":("#3B82F6","rocket"),"dev-isolde":("#C026D3","crown"),"dev-rook":("#10B981","mask")}
figs = []
for id,name,al,ty,bl,uni,eras in F:
    f = {"id":id,"name":name,"aliases":al,"type":ty,"blurb":bl,"wikipedia":None,"wikidata":None,"universe":uni or "","eras":[]}
    if id in tok: f["token"]={"color":tok[id][0],"symbol":tok[id][1]}
    for label,x,y,unk,wob in eras:
        f["eras"].append({"label":label,"answers":answers(x,y,unk,wob)})
    figs.append(f)
json.dump(figs, open(os.path.join(root,'dev-figures.json'),'w'), indent=1)
json.dump([{"id":"dev-cast","title":"The invented cast","description":"Seven made-up figures used as stand-in data.","figures":[f["id"] for f in figs]},
           {"id":"dev-fiction","title":"Invented fiction","description":"Made-up game, novel and cyberpunk characters.","figures":["dev-thorne","dev-isolde","dev-rook"]}],
          open(os.path.join(root,'dev-boards.json'),'w'), indent=1)
print(len(figs))
