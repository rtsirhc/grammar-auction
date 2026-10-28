"""Run using a Python environment with Playwright installed."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess, json, os
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'browser-control-reports/assets/2026-10-28-halloween'
OUT.mkdir(parents=True,exist_ok=True)
server=subprocess.Popen(['node','local/server.cjs'],cwd=ROOT,env={**os.environ,'PORT':'3017'},stdout=subprocess.PIPE,text=True)
try:
 while 'Maestro:' not in server.stdout.readline():
  if server.poll() is not None: raise RuntimeError('Server failed')
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  try:
   errors=[];external=[];base='http://127.0.0.1:3017'
   def page(mobile=False):
    context=browser.new_context(viewport={'width':390 if mobile else 1366,'height':844 if mobile else 768})
    context.route('**/*',lambda route: route.continue_() if route.request.url.startswith(base+'/') else (external.append(route.request.url),route.abort())[-1])
    tab=context.new_page();tab.set_default_timeout(8000);tab.on('pageerror',lambda e:errors.append(str(e)));return tab
   teacher=page();teacher.goto(base+'/');teacher.screenshot(path=str(OUT/'landing.png'))
   teacher.get_by_role('button',name='✦ Vocabulario').click();assert teacher.locator('.vocab-tile').count()==16
   teacher.screenshot(path=str(OUT/'vocabulary.png'));teacher.get_by_role('button',name='Cerrar tarjetas').click()
   teacher.locator('.role-card').first.click();teacher.wait_for_function('peer && peer.stream && peer.stream.readyState===1')
   assert teacher.evaluate('JSON.stringify(hostState.topicFilters)')=='["halloween"]'
   assert teacher.evaluate('filteredQuestionBank().length')==32
   assert teacher.evaluate('new Set(QUESTIONS.map(q=>q.id)).size === QUESTIONS.length')
   assert teacher.evaluate('QUESTIONS.filter(q=>q.topic==="bakery" && q.level==="B2").length')==4
   code=teacher.locator('#hostRoomCode').inner_text();students=[]
   for i in range(3):
    tab=page(True);tab.goto(base+'/?role=client&room='+code);tab.locator('#clientTeamInput').fill('Spooky '+str(i+1));tab.locator('#clientJoinBtn').click();tab.wait_for_function('clientState.hasJoined');students.append(tab)
   teacher.locator('#spookySound').click();assert teacher.evaluate('spookySoundEnabled && audioCtx.state==="running"')
   teacher.locator('#startGameBtn').click();teacher.locator('#nextQuestionBtn').click()
   assert teacher.locator('#questionArt svg').count()==1
   teacher.screenshot(path=str(OUT/'question.png'))
   answer=teacher.evaluate('hostState.shuffledQuestions[0].status')
   for tab in students:
    tab.locator('#legalBtn' if answer=='LEGAL' else '#illegalBtn').click();tab.locator('#submitBetBtn').click()
   teacher.wait_for_function('Object.keys(hostState.bets).length===3');teacher.locator('#skipTimerBtn').click()
   for tab in students:tab.wait_for_function('clientState.balance===1100')
   teacher.screenshot(path=str(OUT/'answer.png'));students[0].screenshot(path=str(OUT/'student.png'))
   teacher.locator('#spookySound').click();assert teacher.evaluate('!spookySoundEnabled')
   identity=students[0].evaluate('clientState.teamId');students[0].reload();students[0].wait_for_function('clientState.hasJoined && clientState.balance===1100');assert students[0].evaluate('clientState.teamId')==identity
   teacher.reload();teacher.wait_for_function('hostState.roundRevealed && Object.values(hostState.teams).length===3 && Object.values(hostState.teams).every(t=>t.conn && t.conn.open)',timeout=15000)
   # Advance through the complete shuffled deck and prove exhaustion does not end the game.
   teacher.evaluate('''() => { for(let i=0;i<34;i++){ nextQuestion(); skipTimer(); } }''')
   assert teacher.evaluate('hostState.currentQ===35 && !hostState.finalChallengeActive')
   teacher.emulate_media(reduced_motion='reduce')
   assert teacher.locator('.flying-bat').evaluate('(el)=>getComputedStyle(el).animationName')=='none'
   assert not errors,errors
   assert not external,external
   print(json.dumps({'passed':True,'students':3,'cards':32,'vocabulary':16,'rounds':35,'audio_context':'running, then muted','reload':'student and teacher','external_requests':external,'page_errors':errors}))
  finally:browser.close()
finally:server.terminate();server.wait(timeout=5)
