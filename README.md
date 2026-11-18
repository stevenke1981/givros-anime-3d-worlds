# 春櫻山村

從溪谷入口遠眺春日山村，走過朱橋、沿水田與竹徑登上神社。場景用原創 Blender 構件組裝瓦屋、石階、石燈籠與林木，近看可辨木紋、石材磨耗和枝端花瓣。

## 開始散步

安裝 Node.js 22.12 或更新版本，並使用支援 WebGL 2 的瀏覽器。

~~~sh
npm ci
npm run dev
~~~

開啟終端顯示的本機網址，選擇「開始散步」或直接切換觀景位置。電腦可用 WASD 移動、拖曳環顧，方向鍵也能移動和轉身。手機可按住方向按鈕移動。選「回入口」可重走路線，按 Esc 或點「回全景」可退出散步。

## 建置與驗證

~~~sh
npm test
npm run build
npm run preview
~~~

正式產物在 `dist/`。把目錄交給 HTTP 靜態伺服器即可使用，也可放在站點子路徑。瀏覽器驗證以建好的 `dist/` 為輸入。

~~~sh
npx playwright install chromium
npm run smoke
~~~

已有 Chromium 相容瀏覽器時，可用環境變數 `SAKURA_CHROMIUM` 指向執行檔。Playwright 把實際畫面留在 `test-results/`。

## 編輯場景

| 想改什麼 | 入口 |
| --- | --- |
| 地形、路徑、觀景點和碰撞 | `src/world/` |
| 攝影機、導覽和介面 | `src/main.js`、`src/walk.js`、`src/style.css` |
| 可編輯模型與重建流程 | `art/` |
| 瀏覽器載入的 GLB | `public/models/` |

近處櫻花有一層程序生成的 Gaussian 花簇細節，可加上 `?splats=off` 以同一鏡位比對。如要追蹤步行位置，網址可加上 `?trace-walk`。

可走訪場景源自第 01 組設定。十組設計原稿與提示詞使用方式見[繁體中文提示詞指南](README_繁體中文.md)。
