"""Clarity browser smoke. Requires: pip install playwright; playwright install chromium."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT.joinpath('index.html').read_text('utf-8')
CORE = ROOT.joinpath('workflow-core.js').read_text('utf-8')
# Use exact source, injecting local dependency because some CI sandboxes block localhost navigation.
HTML = HTML.replace('<script src="./workflow-core.js"></script>', '<script>'+CORE+'</script>')
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width':390,'height':844},accept_downloads=True)
    failures=[]
    page.on('pageerror',lambda e:failures.append(str(e)))
    page.set_content(HTML)
    assert page.get_by_text('把模糊想法，练成清晰需求。').is_visible()
    assert page.evaluate('window.__clarityTest.flow.VERSION') == '0.2.0'
    page.get_by_role('button',name='开始训练').click()
    for _ in range(7):
        page.locator('#fillMock').click()
        page.locator('#next').click()
    assert page.locator('.briefItem').count() == 7
    assert page.locator('#score').is_disabled()
    page.locator('[data-choice="stress"][data-index="1"]').click()
    page.locator('[data-choice="teachback"][data-index="1"]').click()
    page.locator('#score').click()
    assert page.locator('[data-test="total-score"]').inner_text() == '10'
    assert page.locator('[data-test="semantic-verdict"]').count() == 6
    assert page.get_by_text('待语义核验').count() >= 1
    with page.expect_download() as d:
        page.locator('#downloadBrief').click()
    assert d.value.suggested_filename.endswith('.md')
    assert not failures,failures
    print('Clarity browser smoke passed')
    browser.close()
