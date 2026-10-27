<div align="center">

<img src="extension/icons/icon-128.png" width="96" height="96" alt="Laminor Pro" />

# لامینور پرو · Laminor Pro

**افزونه‌ی رایگان و متن‌باز کروم و فایرفاکس برای صفحه‌های آکورد [laminor.org](https://laminor.org)**

تغییر گام · ساده‌سازی با کاپو · راهنمای انگشت‌گذاری · ذخیره‌ی گام · پرینت و PDF

[⬇️ دانلود آخرین نسخه](https://github.com/MahdiGraph/laminor-pro/releases/latest) · [راهنمای نصب](#نصب) · [English](#english)

</div>

<div dir="rtl">

![پنل لامینور پرو بالای آکوردهای یک آهنگ](docs/screenshot-panel.png)

## چی کار می‌کنه؟

بعد از نصب، بالای آکورد هر آهنگ در لامینور یه پنل ابزار ظاهر می‌شه. همه‌ی محاسبه‌ها توی خود مرورگر شما و روی همون آکوردهایی انجام می‌شه که سایت نمایش می‌ده؛ افزونه هیچ درخواستی به جایی نمی‌فرسته.

| قابلیت | وضعیت | توضیح |
|---|:---:|---|
| ساده‌سازی با کاپو | ✅ | بهترین فرت کاپو رو خودش حساب می‌کنه تا آکوردها به ساده‌ترین فرم‌های باز (Am، C، G، E، …) تبدیل بشن. برای همه‌ی آهنگ‌ها کار می‌کنه؛ فرت رو دستی هم می‌شه انتخاب کرد. |
| تغییر گام | ✅ | با دکمه‌های + و − یا انتخاب مستقیم گام. نت‌های عرضی بر اساس گام با دیز یا بمل نوشته می‌شن (یا هر کدوم که خودتون بخواید). |
| ذخیره‌ی آکورد در گام موردنظر | ✅ | گام، کاپو و حالت ساده‌ی هر آهنگ ذخیره می‌شه و دفعه‌ی بعد خودکار اعمال می‌شه. لیست آهنگ‌های ذخیره‌شده توی پنجره‌ی افزونه هست. (ذخیره در مرورگر خودتون، نه حساب لامینور) |
| راهنمای انگشت‌گذاری | ✅ | دیاگرام همه‌ی آکوردهای آهنگ به ترتیب اجرا، با شماره‌ی انگشت، باره و سیم‌های باز/بسته. با کلیک روی هر دیاگرام حالت‌های دیگه‌ی همون آکورد رو می‌بینید و با بردن ماوس روی هر آکورد هم دیاگرامش نشون داده می‌شه. حالت چپ‌دست هم داره. |
| پرینت آکوردها (PDF) | ✅ | نسخه‌ی تمیز آکورد با گام و کاپوی انتخابی و دیاگرام‌ها. برای فایل PDF در پنجره‌ی پرینت «Save as PDF» رو انتخاب کنید. |
| دسترسی به آکوردهای نسخه ساده | ⚠️ | این نسخه‌ها رو تیم لامینور جدا تنظیم کرده و سرور برای غیرمشترک‌ها فقط دو خط اول رو می‌فرسته، پس قابل انجام نیست. به‌جاش گزینه‌ی «آکوردهای ساده» آکوردهای پیچیده (مثل Cmaj7، Asus4، Bm7) رو به ساده‌ترین شکل قابل‌اجرا تبدیل می‌کنه که همراه ساده‌سازی با کاپو نتیجه‌ی نزدیکی می‌ده. |
| ویدیوهای اجرای ریتم و دوره‌ها | ❌ | محتوای ویدیویی روی سرور سایته و این افزونه کاری به اون نداره. |

**یه مثال:** آهنگ «تقدیر» از شادمهر عقیلی در گام Cm با آکوردهای Ab، Bb، Cm، Gm، Eb و Fm نوشته شده که بیشترشون باره هستن. با «ساده‌سازی با کاپو» افزونه کاپو رو روی فرت ۳ می‌ذاره و همون آهنگ با F، G، Am، Em، C و Dm زده می‌شه.

## نصب

### کروم (و Edge، Brave، Opera و بقیه‌ی مرورگرهای کرومیومی)

1. فایل `laminor-pro-chrome-v1.0.0.zip` رو از [صفحه‌ی Releases](https://github.com/MahdiGraph/laminor-pro/releases/latest) دانلود کنید و از حالت فشرده خارج کنید.
2. توی نوار آدرس `chrome://extensions` رو باز کنید (در Edge‏ `edge://extensions` و در Brave‏ `brave://extensions`).
3. گزینه‌ی **Developer mode** رو در گوشه‌ی صفحه روشن کنید.
4. روی **Load unpacked** کلیک کنید و پوشه‌ای که از zip درآوردید رو انتخاب کنید (پوشه‌ای که فایل `manifest.json` داخلشه).
5. یه صفحه‌ی آکورد لامینور رو باز کنید (اگه از قبل بازه، رفرشش کنید). پنل «لامینور پرو» بالای آکوردها ظاهر می‌شه.

> بعد از نصب، پوشه رو پاک نکنید؛ کروم افزونه رو از همون‌جا اجرا می‌کنه. برای آپدیت، فایل‌های نسخه‌ی جدید رو جایگزین کنید و در `chrome://extensions` دکمه‌ی ↻ افزونه رو بزنید.
>
> راه دیگه: از دکمه‌ی سبز **Code ← Download ZIP** کل مخزن رو بگیرید و در مرحله‌ی ۴ پوشه‌ی `extension` رو انتخاب کنید.

### فایرفاکس

**نصب موقت (همه‌ی نسخه‌های فایرفاکس):**

1. فایل `laminor-pro-firefox-v1.0.0.xpi` رو از [صفحه‌ی Releases](https://github.com/MahdiGraph/laminor-pro/releases/latest) دانلود کنید.
2. آدرس `about:debugging#/runtime/this-firefox` رو باز کنید.
3. روی **Load Temporary Add-on…** کلیک کنید و فایل xpi رو انتخاب کنید (یا فایل `manifest.json` داخل پوشه‌ی `extension`).
4. صفحه‌ی آکورد لامینور رو باز یا رفرش کنید.

> افزونه‌ی موقت با بستن فایرفاکس حذف می‌شه و دفعه‌ی بعد باید دوباره بارگذاری بشه.

**نصب دائمی:** فایرفاکس معمولی فقط افزونه‌هایی رو دائمی نصب می‌کنه که موزیلا امضاشون کرده باشه. دو راه دارید:

- با [Firefox Developer Edition](https://www.mozilla.org/firefox/developer/)، Nightly یا ESR: در `about:config` مقدار `xpinstall.signatures.required` رو `false` کنید، بعد در `about:addons` از منوی ⚙️ گزینه‌ی **Install Add-on From File…** رو بزنید و فایل xpi رو انتخاب کنید.
- امضای رایگان یه نسخه‌ی شخصی در [addons.mozilla.org](https://addons.mozilla.org/developers/) (گزینه‌ی «On your own») و نصب فایل امضاشده.

> اگه پنل نمایش داده نشد: روی آیکون افزونه‌ها (🧩) در نوار ابزار کلیک کنید و برای Laminor Pro دسترسی به laminor.org رو فعال کنید («Always allow on laminor.org»).

## استفاده

- **تغییر گام:** با + و − نیم‌پرده‌به‌نیم‌پرده جابه‌جا کنید یا مستقیم روی گام دلخواه بزنید. نقطه‌ی زیر یکی از گام‌ها یعنی گام اصلی آهنگ.
- **کاپو:** فرت رو از لیست انتخاب کنید یا «✨ ساده‌سازی با کاپو» رو بزنید تا افزونه ساده‌ترین حالت رو پیدا کنه. زیرش نوشته می‌شه کاپو رو کجا ببندید و آکوردها رو در چه گامی بزنید.
- **آکوردهای ساده:** آکوردهای پیچیده رو به آکوردهای سه‌صدایی ساده (یا هفتمِ ساده‌تر، مثل B7 به‌جای B) تبدیل می‌کنه.
- **راهنمای انگشت‌گذاری:** دیاگرام‌ها به ترتیب اجرای آهنگ نمایش داده می‌شن؛ روی هر دیاگرام کلیک کنید تا حالت بعدی همون آکورد بیاد.
- **ذخیره گام:** تنظیمات فعلی رو برای این آهنگ نگه می‌داره. «حذف ذخیره» و دکمه‌ی «اصلی» همه‌چیز رو برمی‌گردونه.
- **پرینت / PDF:** هم توی پنل و هم کنار دکمه‌ی دانلود PDF خود سایت هست.
- **تنظیمات کلی:** روی آیکون افزونه در نوار ابزار کلیک کنید: نمایش پیش‌فرض دیاگرام‌ها، ساده‌سازی پیش‌فرض با کاپو، نوشتن نت‌ها با دیز یا بمل، دیاگرام چپ‌دست، پنهان‌کردن دکمه‌های قفل‌شده‌ی خود سایت و لیست آهنگ‌های ذخیره‌شده.

## حریم خصوصی

- افزونه هیچ داده‌ای جمع‌آوری نمی‌کنه و هیچ درخواست شبکه‌ای نمی‌فرسته.
- تنظیمات و گام‌های ذخیره‌شده فقط در حافظه‌ی افزونه در مرورگر خودتون می‌مونه.
- دسترسی‌ها فقط `storage` و صفحه‌های laminor.org هستن.

## یادداشت

- این پروژه غیررسمیه و ارتباطی با تیم لامینور نداره.
- افزونه به سیستم اشتراک سایت دست نمی‌زنه و محتوای قفل‌شده‌ای رو باز نمی‌کنه: همه‌ی ابزارها مستقل و از نو نوشته شدن و روی آکوردهایی کار می‌کنن که سایت به همه نشون می‌ده. محتوایی که سایت فقط به مشترک‌ها می‌ده (نسخه‌های ساده، ویدیوهای ریتم، دوره‌ها) دست‌نخورده می‌مونه.
- آکوردها و متن ترانه‌ها متعلق به صاحبانشون و لامینور هستن. اگه از لامینور استفاده می‌کنید، [اشتراک](https://laminor.org/pricing) یا [حمایت مالی](https://laminor.org/donate) به ادامه‌ی کار سایت کمک می‌کنه.
- باگ یا پیشنهاد؟ [یه Issue بسازید](https://github.com/MahdiGraph/laminor-pro/issues).

</div>

<p align="center"><img src="docs/screenshot-popup.png" width="300" alt="پنجره‌ی تنظیمات افزونه" /></p>

---

## English

**Laminor Pro** is a free, open-source browser extension (Chrome, Edge, Brave, Opera and Firefox) that adds player tools to the chord pages of [laminor.org](https://laminor.org), a Persian guitar-chord site:

- **Capo simplification** — finds the capo fret that turns a song into the easiest open-chord shapes (e.g. *Taghdir* in C minor, `Ab Bb Cm Gm Eb Fm`, becomes `F G Am Em C Dm` with capo 3).
- **Transpose** — semitone steps or direct key selection, with key-aware sharp/flat spelling.
- **Saved keys** — key, capo and options are remembered per song (stored locally in the browser) and listed in the toolbar popup.
- **Fingering guide** — chord diagrams with fingers, barres and open/muted strings, alternative voicings, hover diagrams and a left-handed mode.
- **Print / PDF** — a clean print layout with the chosen key, capo and diagrams.
- **Simple chords** — reduces extended chords to easy triads (or easier sevenths such as B7).

Laminor's curated "simple versions", rhythm videos and courses are served only to subscribers and are left untouched. Everything else is computed locally from the chords the page already shows; the extension makes no network requests and collects no data. Not affiliated with Laminor.

### Install

- **Chrome / Chromium browsers:** download `laminor-pro-chrome-v*.zip` from [Releases](https://github.com/MahdiGraph/laminor-pro/releases/latest) and unzip it → open `chrome://extensions` → enable **Developer mode** → **Load unpacked** → pick the unzipped folder.
- **Firefox (temporary):** download `laminor-pro-firefox-v*.xpi` → `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** → pick the file. For a permanent install use Developer Edition/Nightly/ESR with `xpinstall.signatures.required = false`, or self-sign it on [AMO](https://addons.mozilla.org/developers/).

### Development

```
extension/
  manifest.json      Manifest V3, works in Chrome and Firefox
  src/core/          music logic without DOM: chord parsing, transposition,
                     chord shapes + difficulty, capo search, sheet parser
  src/content/       panel, sheet rendering, SVG diagrams, print, entry point
  src/popup/         toolbar popup (options + saved songs)
  src/shared/        storage wrapper (chrome.* / browser.*)
tests/
  core.test.js       unit tests, incl. a check that every chord shape plays
                     exactly the notes of its chord
  e2e/chromium.js    optional smoke test against the live site
scripts/build.mjs    builds dist/*.zip (Chrome) and dist/*.xpi (Firefox)
```

```bash
npm test                 # unit tests (Node 20+)
npm run lint             # Mozilla web-ext lint
npm run build            # installable archives in dist/
npm install && npx playwright-core install chromium && npm run test:e2e
```

The chord sheet is re-rendered with each chord in a slot that keeps the original chord's width, so transposed chords never shift the alignment with the lyrics. To release, bump `version` in `extension/manifest.json` and `package.json`, then publish a GitHub release — the workflow attaches the archives.

License: [MIT](LICENSE)
