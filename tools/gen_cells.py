"""Generates data/cells.json: 25 regions (5x5 blocks of 2x2 cells) mapped onto the 10x10 grid.
Rows go from Authoritarian (top) to Libertarian (bottom); columns from Economic Left to Economic Right."""
import json, os
R = {}
def reg(rid, name, views, ideo, sup, cri):
    R[rid] = dict(name=name, views=views, ideologies=[dict(name=a, def_=b, wiki=c) for a,b,c in ideo], supporters=sup, critics=cri)

reg("0,0","Centrally planned left",
 ["The economy is directed through a national plan, with major industries owned by the state.",
  "A single organized party or council is trusted to coordinate production and politics.",
  "Security and discipline are seen as necessary to protect shared gains.",
  "Individual freedoms are weighed against collective goals and often rank second."],
 [("Marxism–Leninism","A communist tradition that favors a vanguard party and a state-owned, planned economy.","Marxism–Leninism"),
  ("State socialism","A model where the state owns and runs the main means of production.","State socialism"),
  ("Democratic centralism","A party practice of open debate followed by binding unity once a decision is made.","Democratic centralism")],
 "Supporters say a central plan can direct resources to need instead of profit, remove unemployment, and move quickly on national goals, while a disciplined state defends those gains from internal and outside pressure.",
 "Critics say a central plan struggles to gather enough information, and a party that controls both economy and politics can silence dissent, which removes the feedback that would help correct its own mistakes.")
reg("0,1","Order-first left",
 ["Redistribution and public ownership are paired with a strong, unified state.",
  "National solidarity and discipline are treated as the base of fair economic life.",
  "Political opposition is tolerated less than in democratic left traditions.",
  "Leaders who claim to speak for working people often hold broad powers."],
 [("Ba'athism","An Arab nationalist and socialist movement favoring a single-party state.","Ba'athism"),
  ("Peronism","An Argentine movement joining labor rights, state intervention and a strong leader.","Peronism"),
  ("Left-wing nationalism","Politics that links social equality with national self-determination.","Left-wing nationalism")],
 "Supporters say a strong state is the only force able to stand up to powerful private interests, and that shared national purpose gives working people a reliable voice in the economy.",
 "Critics say concentrated authority is hard to hold accountable, and that a leader who speaks for the people can limit the independent groups and courts that let the people speak for themselves.")
reg("0,2","Strong-state centre",
 ["The state is the main organizer of public life, with a mix of public and private enterprise.",
  "Stability, expertise and clear command are valued above open contest.",
  "Economic views are flexible; the priority is a capable central government.",
  "Rights may be limited when officials judge that order requires it."],
 [("Statism","The view that the state should hold a large role in economic and social affairs.","Statism"),
  ("Technocracy","Rule by specialists chosen for expertise rather than by popular vote.","Technocracy"),
  ("Bonapartism","Strong executive leadership that claims direct backing from the public.","Bonapartism")],
 "Supporters say complex problems need decisive, expert-led government that can plan past the next election, act quickly in a crisis, and avoid being stalled by constant bargaining among rival factions.",
 "Critics say decisions made without open contest can drift from what people want, and that power which is easy to use is also easy to misuse when few can challenge it.")
reg("0,3","Order-first market right",
 ["Private enterprise is welcome, but under close direction from a strong state.",
  "Business, labor and government are expected to cooperate under national goals.",
  "Public order, loyalty and unity are weighed heavily against personal liberty.",
  "Dissent and independent media face tighter limits."],
 [("State capitalism","An economy where the state takes an active, commercial role in business.","State capitalism"),
  ("Corporatism","Organizing society through groups such as industry, labor and professions, coordinated by the state.","Corporatism"),
  ("Fascism","A 20th-century authoritarian nationalist movement stressing a single leader, national unity and state-coordinated economics.","Fascism")],
 "Supporters say pairing market incentives with firm state guidance delivers growth and stability together, and that shared national aims help firms, workers and officials pull in one direction.",
 "Critics say close ties between rulers and business invite favoritism, and that limits on speech and organization remove the checks that expose waste and protect people from official overreach.")
reg("0,4","Hierarchy-and-market right",
 ["Property, inherited institutions and settled hierarchy are treated as stabilizing.",
  "Markets operate within a social order led by a monarch, elite or tradition.",
  "Authority is seen as legitimate when it rests on custom or religion.",
  "Popular participation is limited compared with liberal democracies."],
 [("Monarchism","Support for a monarch as head of state or ruler.","Monarchism"),
  ("Integralism","The view that religious teaching should guide the state and public law.","Integralism"),
  ("Authoritarian conservatism","Conservatism that backs strong rulers to preserve existing institutions.","Authoritarian conservatism")],
 "Supporters say lasting institutions, tested by generations, protect property and continuity better than shifting majorities, and a clear order gives markets and families a stable footing over time.",
 "Critics say inherited rank limits who can rise on merit, and that rule resting on custom leaves ordinary people with few lawful ways to change policies they believe are unfair.")

reg("1,0","Collectivist left",
 ["Shared ownership and common planning take priority over private enterprise.",
  "Class and economic structure are seen as the main drivers of politics.",
  "Strong organization is thought necessary to defend workers' interests.",
  "Some limits on personal liberty are accepted in service of equality."],
 [("Communism","A system aiming at common ownership of property and the end of class divisions.","Communism"),
  ("Marxism","A body of theory analyzing class conflict and capitalism.","Marxism"),
  ("Collectivism","Giving priority to the group over the individual in economic and social life.","Collectivism")],
 "Supporters say common ownership ends exploitation, ties output to need, and gives everyone a stake in the shared economy, with organization strong enough to protect that arrangement.",
 "Critics say common ownership removes price signals and personal incentives, and that the organization needed to run it tends to gather power in a small group.")
reg("1,1","State-led left",
 ["Government plays a large role in the economy: public services, regulation and some public ownership.",
  "Strong unions and worker protections are central policy aims.",
  "Law and order and national institutions are supported, with some limits on liberty.",
  "Elected government is the main tool for reducing inequality."],
 [("Democratic socialism","Socialist goals pursued through elections, with democratic control of key industries.","Democratic socialism"),
  ("Dirigisme","An economy where the state directs investment and industrial strategy.","Dirigisme"),
  ("Labour movement","Collective organization of workers through unions and parties.","Labour movement")],
 "Supporters say an active government can steer investment, guarantee services and protect workers from swings in the market, and that elected leaders need real tools to deliver what voters ask for.",
 "Critics say a large state can crowd out private investment and grow slow to adapt, and that strong central tools, once built, can be used for aims that voters did not choose.")
reg("1,2","Pragmatic authority centre",
 ["A mixed economy with moderate taxes, public services and market competition.",
  "Social order, family and community institutions are given real weight.",
  "A capable state is trusted to enforce laws and protect shared values.",
  "Change is preferred gradually and through established institutions."],
 [("Christian democracy","A tradition mixing social-market economics with moral and community values.","Christian democracy"),
  ("Gaullism","French politics centered on national independence and a strong executive.","Gaullism"),
  ("One-nation conservatism","Conservatism that stresses social responsibility between classes.","One-nation conservatism")],
 "Supporters say balancing markets with community duties produces steady policy that most people can live with, and that firm institutions keep society cohesive through change.",
 "Critics say the middle path can lack a clear direction, and that reliance on established institutions and moral norms can slow reforms that some groups feel are overdue.")
reg("1,3","Traditionalist right",
 ["Markets are favored, alongside respect for tradition, religion and family.",
  "Law enforcement and national defense are seen as core government duties.",
  "Social norms are defended through law and public institutions in some areas.",
  "Immigration and cultural change are approached with caution."],
 [("Social conservatism","Support for traditional social values and institutions.","Social conservatism"),
  ("National conservatism","Conservatism emphasizing national identity, sovereignty and cultural heritage.","National conservatism"),
  ("Neoconservatism","A movement favoring market economics and an active, values-driven foreign policy.","Neoconservatism")],
 "Supporters say shared customs and a secure nation give people the stability to build families and businesses, and that law should reflect values most citizens already hold.",
 "Critics say using law to uphold tradition can restrict people whose lives differ from the norm, and that emphasis on national identity can make it harder to include newcomers.")
reg("1,4","National-market right",
 ["Low taxes and limited regulation, joined with strong borders and firm policing.",
  "National interest and sovereignty guide trade and foreign policy.",
  "Private enterprise is the engine of prosperity, with government limited in economic life.",
  "Public order is prioritized over broad civil protections in some areas."],
 [("Right-wing populism","A style of politics that pits ordinary citizens against established elites, from the right.","Right-wing populism"),
  ("Fiscal conservatism","Support for low spending, low taxes and balanced budgets.","Fiscal conservatism"),
  ("Nationalism","Placing the interests and identity of one's own nation first.","Nationalism")],
 "Supporters say lower taxes and fewer rules free families and firms to prosper, while secure borders and firm policing protect the community that makes that prosperity possible.",
 "Critics say low spending can leave public services thin when people need them, and that tight border and policing policy can burden minorities and slow trade.")

reg("2,0","Democratic socialist left",
 ["Major industries or utilities are under public or worker ownership.",
  "Elections, free press and free assembly are kept as the route to change.",
  "Strong unions and large public programs are central.",
  "Economic democracy is paired with civil rights."],
 [("Socialism","An economic system based on social or collective ownership.","Socialism"),
  ("Market socialism","Socialism where worker-run firms compete in markets.","Market socialism"),
  ("Cooperative","Enterprises owned and run by their members.","Cooperative")],
 "Supporters say shared ownership spreads wealth and voice at work, and that keeping elections and open debate means the public can adjust or reverse the system as they see fit.",
 "Critics say public ownership can weigh down innovation and local choice, and that sweeping ownership changes can be hard to undo if they prove unpopular or costly.")
reg("2,1","Social democratic left",
 ["A market economy with high taxes funding wide public services.",
  "Healthcare, education and pensions are treated as shared guarantees.",
  "Civil liberties and democratic procedure are firmly protected.",
  "Regulation and unions balance the power of employers."],
 [("Social democracy","Reforming capitalism through welfare provision and regulation.","Social democracy"),
  ("Welfare state","A system where government protects citizens' economic and social well-being.","Welfare state"),
  ("Keynesian economics","Using public spending and demand management to steady the economy.","Keynesian economics")],
 "Supporters say a strong safety net and shared services make markets fairer and more stable, and let people take risks knowing a bad break will not ruin them.",
 "Critics say high taxes can reduce investment and work incentives, and that large programs may grow costly and harder to reform than the budgets that first funded them.")
reg("2,2","Balanced centre",
 ["A mix of market competition and public provision; no single doctrine leads.",
  "Policies are judged one by one on evidence and trade-offs.",
  "Both personal liberty and public safety carry weight.",
  "Compromise between camps is seen as a strength."],
 [("Centrism","A position between left and right that mixes ideas from both.","Centrism"),
  ("Third Way","A 1990s approach pairing market economics with social goals.","Third Way"),
  ("Social market economy","A market system with a framework of social protections.","Social market economy")],
 "Supporters say choosing policies by their results rather than by loyalty lets governments adapt, and that compromise keeps a divided society working together.",
 "Critics say judging each issue alone can lack a guiding principle, and that seeking the midpoint may avoid bold change when it is needed.")
reg("2,3","Market-leaning centre-right",
 ["Markets are trusted to lead, with a modest safety net and rules for fair competition.",
  "Fiscal discipline and predictable rules are priorities.",
  "Civil liberties are broadly supported, with some role for tradition.",
  "Trade and enterprise are seen as sources of opportunity."],
 [("Liberal conservatism","A blend of market liberalism with respect for tradition and institutions.","Liberal conservatism"),
  ("Ordoliberalism","A German school favoring free markets under a strong legal framework.","Ordoliberalism"),
  ("Neoliberalism","A set of policies promoting markets, privatization and trade openness.","Neoliberalism")],
 "Supporters say competition and clear rules raise living standards and reward effort, while a modest safety net and stable budgets protect the public without discouraging work.",
 "Critics say market outcomes can leave some regions and workers behind, and that cutting back public provision can widen gaps that a modest safety net does not fully close.")
reg("2,4","Free-market right",
 ["Low taxes, limited regulation and private ownership are the default.",
  "Voluntary exchange is seen as the most reliable path to prosperity.",
  "Government is kept to core functions such as courts and defense.",
  "Social questions are often left to individual choice."],
 [("Laissez-faire","An approach where government does not interfere in economic affairs.","Laissez-faire"),
  ("Supply-side economics","Cutting taxes and rules to encourage production and investment.","Supply-side economics"),
  ("Chicago school","An economics tradition favoring free markets and limited intervention.","Chicago school of economics")],
 "Supporters say open markets reward innovation and spread goods widely, and that limiting government keeps decisions with the people who bear their consequences.",
 "Critics say unregulated markets can concentrate wealth and overlook costs such as pollution, and that a thin safety net leaves little protection when luck turns.")

reg("3,0","Cooperative libertarian left",
 ["Shared ownership and worker control are favored, without a strong central state.",
  "Decisions are made in councils, unions and community groups.",
  "Civil liberties are treated as essential to real equality.",
  "Hierarchies of any kind need constant justification."],
 [("Libertarian socialism","Socialism that rejects state control in favor of free association and worker self-management.","Libertarian socialism"),
  ("Syndicalism","Organizing the economy through trade unions and worker federations.","Syndicalism"),
  ("Mutualism","A tradition built on cooperative exchange and credit among producers.","Mutualism (economic theory)")],
 "Supporters say people who do the work should run the workplace, and that voluntary federations spread power so no single office can dominate public life.",
 "Critics say large-scale coordination without central authority is hard to organize, and that informal councils can be dominated by the most persistent members or fail to settle disputes.")
reg("3,1","Progressive reform left",
 ["Public services and regulation are paired with strong personal and civil rights.",
  "Reform is pursued through courts, legislatures and civil society.",
  "Inequality across groups is treated as a central issue to address.",
  "Environmental policy is a leading priority."],
 [("Progressivism","A reform tradition seeking social change through government and policy.","Progressivism"),
  ("Social liberalism","Liberalism that supports economic regulation alongside personal freedom.","Social liberalism"),
  ("Green politics","Politics centered on ecology, sustainability and participation.","Green politics")],
 "Supporters say pairing public action with strong rights lets society correct unfair outcomes while protecting minorities and the environment from decisions made on short-term interest.",
 "Critics say broad reform agendas can raise costs and compliance burdens, and that social change led from the top can move faster than public consensus allows.")
reg("3,2","Civil-liberties centre",
 ["Personal freedom, rule of law and open debate come first; economics is flexible.",
  "Government should be limited by clear rights and strong courts.",
  "Both public provision and markets are acceptable where they work.",
  "Free expression and privacy are defended across the board."],
 [("Liberalism","A tradition centered on individual rights, consent and limited government.","Liberalism"),
  ("Liberal democracy","Elected government limited by law and protected rights.","Liberal democracy"),
  ("Civil libertarianism","Strong defense of civil rights against state power.","Civil libertarianism")],
 "Supporters say guarding rights and the rule of law gives people room to pursue their own goals, and that free debate is the best method of finding and fixing errors.",
 "Critics say a focus on procedure can leave economic and security concerns unaddressed, and that strict limits on government may slow its response to urgent shared problems.")
reg("3,3","Classical-liberal right",
 ["Free markets and strong individual rights are viewed as linked.",
  "Government is limited by a constitution and independent courts.",
  "Low taxes and open trade are favored; personal lifestyles are left alone.",
  "Voluntary association is preferred to mandates."],
 [("Classical liberalism","Liberty, limited government and free markets as the base of a free society.","Classical liberalism"),
  ("Economic liberalism","Support for private ownership and market allocation of resources.","Economic liberalism"),
  ("Conservative liberalism","Liberalism joined with a conservative approach to institutions.","Conservative liberalism")],
 "Supporters say protecting property and personal rights together builds trust and prosperity, and that limited government stays responsive when its powers are narrow and clear.",
 "Critics say strict limits on public action may leave gaps in health, housing and education, and that formal equality of rights does not always yield equal real opportunity.")
reg("3,4","Market libertarian right",
 ["Private property, free exchange and minimal government are central principles.",
  "Taxes and regulation are viewed as intrusions on personal choice.",
  "Personal freedoms, including drug and lifestyle choices, are strongly defended.",
  "Government is limited to protecting rights."],
 [("Libertarianism","Political philosophy that treats individual liberty as the highest aim.","Libertarianism"),
  ("Objectivism","A philosophy by Ayn Rand favoring rational self-interest and laissez-faire capitalism.","Objectivism"),
  ("Minarchism","The view that the state should be limited to a small set of functions.","Minarchism")],
 "Supporters say consistent respect for choice and property creates both freedom and prosperity, and that fewer rules let people and firms find solutions that planners would miss.",
 "Critics say markets alone may not supply shared goods like clean air or basic healthcare, and that a very small state can leave people without recourse when private arrangements fail.")

reg("4,0","Anarcho-collectivist left",
 ["A stateless society based on common ownership and mutual aid.",
  "Decisions are made by communities and federations of workers.",
  "Rejects both capitalism and state authority.",
  "Emphasizes equality and solidarity as the basis of freedom."],
 [("Anarcho-communism","Stateless society with common ownership and distribution by need.","Anarcho-communism"),
  ("Anarcho-syndicalism","Anarchism organized through revolutionary unions.","Anarcho-syndicalism"),
  ("Social anarchism","Anarchist traditions that stress cooperation and collective freedom.","Social anarchism")],
 "Supporters say people can organize themselves through voluntary cooperation, and that removing both bosses and rulers lets equality and freedom support each other.",
 "Critics say large societies need some enforceable rules to settle disputes and provide shared services, and that voluntary arrangements may not hold when interests clash.")
reg("4,1","Voluntary-cooperation left",
 ["Communities, cooperatives and local assemblies make decisions together.",
  "Large states and large corporations are both viewed with caution.",
  "Strong personal liberty, with shared support through mutual aid.",
  "Change is sought through building alternatives and direct participation."],
 [("Anarchism","Opposition to compulsory authority, including the state.","Anarchism"),
  ("Mutual aid","Voluntary exchange of resources and services for mutual benefit.","Mutual aid (organization theory)"),
  ("Libertarian municipalism","Direct democracy through local assemblies linked in confederation.","Libertarian municipalism")],
 "Supporters say local, voluntary groups keep decisions close to the people affected, and that mutual aid can meet needs without large bureaucracies or powerful owners.",
 "Critics say small-scale models may not handle national challenges like defense or infrastructure, and that active participation demands time that not everyone has to give.")
reg("4,2","Minimal-state centre",
 ["Very limited government with maximum personal and voluntary choice.",
  "Economic views vary, from cooperative to commercial arrangements.",
  "Strong skepticism of surveillance, coercion and state power.",
  "Individual conscience guides political decisions."],
 [("Individualist anarchism","Anarchist thought that stresses individual sovereignty.","Individualist anarchism"),
  ("Voluntaryism","The view that all human relationships should be voluntary.","Voluntaryism"),
  ("Left-libertarianism","Libertarian thought that couples self-ownership with shared claims on natural resources.","Left-libertarianism")],
 "Supporters say people are best placed to run their own lives, and that consent should be the test of any rule, whether it comes from government or from a private party.",
 "Critics say strict reliance on consent can leave out people who cannot bargain on equal terms, and that common services are difficult to supply without some compulsory contribution.")
reg("4,3","Voluntary-market centre-right",
 ["Private property and voluntary contracts are the base of social order.",
  "Government is replaced or sharply reduced, with private provision of services.",
  "Personal freedom of association and exit is stressed.",
  "Skeptical of both regulation and welfare programs."],
 [("Right-libertarianism","Libertarian thought stressing self-ownership and private property.","Right-libertarianism"),
  ("Agorism","A philosophy seeking a society built on voluntary markets outside state control.","Agorism"),
  ("Austrian school","An economics tradition that emphasizes individual action and market processes.","Austrian school")],
 "Supporters say voluntary contracts and competing providers can supply even law and security more responsively than a monopoly, and that people can leave a provider they dislike.",
 "Critics say private provision of core functions may favor those who can pay, and that without a shared legal authority, disputes between powerful parties can be hard to resolve fairly.")
reg("4,4","Anarcho-market right",
 ["A fully private-property society without a state.",
  "Courts, defense and roads are provided by competing private firms.",
  "Strong support for personal liberty and voluntary exchange.",
  "Taxation is viewed as coercion."],
 [("Anarcho-capitalism","Anarchism joined with free-market capitalism and private property.","Anarcho-capitalism"),
  ("Agorism","Counter-economics and market activity outside state control.","Agorism"),
  ("Anarchism","Opposition to compulsory authority, including the state.","Anarchism")],
 "Supporters say all services, including justice, can be provided by voluntary contract, and that removing taxation honors consent and lets competition raise quality and lower prices.",
 "Critics say competing private security and courts may serve the wealthy better than the poor, and that without a shared framework the strong could set the terms.")

def wc(s): return len(s.split())
bad = []
for k, r in R.items():
    a, b = wc(r['supporters']), wc(r['critics'])
    if abs(a-b) > 3: bad.append((k, a, b))
print('length mismatches (>3 words):', bad)

def note(rid, r, c):
    cc = c % 2; rr = r % 2           # position inside the 2x2 block
    nm = R[rid]['name']
    ec = 'left half' if cc == 0 else 'right half'
    sv = 'upper, more authoritarian half' if rr == 0 else 'lower, more libertarian half'
    return f"This tile is part of the {nm} region: the {ec} of it on economics and the {sv} on social questions. Neighbouring tiles blend into the next region."

cells = []
grid = []
for r in range(10):
    row = []
    for c in range(10):
        rid = f"{r//2},{c//2}"
        row.append(rid)
        cells.append(dict(r=r, c=c, region=rid, econ=[-10+2*c, -8+2*c], social=[8-2*r, 10-2*r], note=note(rid, r, c)))
    grid.append(row)
out = {"regions": {k: dict(id=k, name=v['name'], views=v['views'],
        ideologies=[dict(name=i['name'], def_=i['def_'], wiki=i['wiki']) for i in v['ideologies']],
        supporters=v['supporters'], critics=v['critics']) for k, v in R.items()},
       "cells": cells}
# json key cannot be "def_" in a nicer way: rename
s = json.dumps(out, indent=1, ensure_ascii=False).replace('"def_"', '"def"')
open(os.path.join(os.path.dirname(__file__), '..', 'data', 'cells.json'), 'w').write(s)
print(len(R), 'regions', len(cells), 'cells')
