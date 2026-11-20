# 十景漫步

走過春櫻山村的朱橋、登上杉林山寺，也能沿漁村碼頭、雪國溫泉和祭典街道散步。十景以原創 Blender 構件組裝，分別設計地形、水路、照明與沿途地標。

## 開始散步

安裝 Node.js 22.12 或更新版本，並使用支援 WebGL 2 的瀏覽器。

~~~sh
npm ci
npm run dev
~~~

開啟終端顯示的本機網址。打開「場景選單」選景，接著選「開始散步」或點下方的觀景位置。電腦可用 WASD 或方向鍵移動，拖曳畫面環顧。手機可按住方向按鈕移動。選「回入口」可重走路線，按 Esc 或點「回全景」可退出散步。

十景都從玩家眼高開場，也可選「全景」俯瞰路線。春櫻田岸有草穗和野杜鵑，竹徑與杉林寺院有蕨類，海岬有風剪樹冠的松樹，湖畔有成帶的蘆草，雪地和夜祭沿路保留各自的植被密度與照明。

切換場景後可直接分享網址。要從特定場景開啟，可加上 `?scene=07`，編號為 `01` 至 `10`。

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

已有 Chromium 相容瀏覽器時，可用環境變數 `SAKURA_CHROMIUM` 指向執行檔。Playwright 會從場景選單逐景驗證步行和 Gaussian 圖層，並把步道、全景和地標的實際畫面留在 `test-results/`。

## 編輯場景

| 想改什麼 | 入口 |
| --- | --- |
| 春櫻地形、路徑、觀景點和碰撞 | `src/world/sakura.js`、`src/world/layout.js` |
| 其餘九景的佈局、植栽群落、山脊與地表 | `src/world/regions/`，各景植栽在 `planting.js` |
| 攝影機、導覽和介面 | `src/main.js`、`src/walk.js`、`src/style.css` |
| 可編輯模型與重建流程 | [春櫻模型](art/README.md)、[各景共用構件](art/region-README.md) |
| 可重用的場景製作技能 | [十景漫步場景製作](.agents/skills/valley-scene-workflow/SKILL.md) |
| 瀏覽器載入的 GLB | `public/models/` |

Gaussian 細節取樣自枝葉、草地和山體的實際網格，沿表面投影並接受深度遮蔽。地表覆蓋率控制濕岸、裸土和雪地的取樣，各組構件共同分配取樣預算。觸控裝置採用較低的來源取樣和可見實例預算。加上 `?splats=off` 可在同一鏡位比較，加上 `?trace-splats` 可取得各類別的實例數。追蹤步行位置可用 `?trace-walk`。

十景的代表構件以 Cycles 烘焙獨立 AO，由 GLB 的第二組 UV 取樣。底色使用 sRGB，法線、粗糙度與 AO 使用非色彩資料。各景有自己的半浮點 HDR 環境光與 ACES 曝光，支援浮點渲染目標的裝置用一次全螢幕後製處理高光與邊緣。材質來源、烘焙規格及重建方式見 [地標材質烘焙](art/baked-landmarks.md)。

在同一 URL 加上 `lighting=legacy` 可回到舊渲染與 GLB，`ao=off` 可單獨檢查烘焙遮蔽。先建置，再執行 `npm run compare:lighting`，即可在 `release/lighting-comparison/` 產生溪岸、梯田與夜祭的固定鏡位對照。

地表和 Blender 構件共用一張線性程序細節貼圖。地形以三平面投影補上土壤、濕石與山壁的微表面，構件按材質疊加細紋並保留原有貼圖與 Cycles AO。金屬度變化用於外露五金。河流、田水、湖和海採樣各景的 HDR 環境反射，葉片與草梢依風擺動並遵循系統的減少動態效果設定。

保留 HDR 與烘焙材質的對照模式為 `?surface=legacy`。建置後執行 `npm run compare:lighting -- --surfaces` 可在 `release/physical-surface-comparison/` 取得溪岸、梯田、海岬和夜祭的固定鏡位截圖與相機座標。

十組設計原稿與提示詞使用方式見[繁體中文提示詞指南](README_繁體中文.md)。
