# 十景漫步

- 執行入口見 [README](README.md)。先跑 `npm ci`、`npm test` 和 `npm run build`，驗證瀏覽器時再跑 `npm run smoke`。
- `src/world/sakura.js` 與 `src/world/regions/index.js` 提供場景、玩家起點、景點相機、地表高度、可走範圍和每幀更新。世界採 Three.js 的 Y 向上座標，單位為公尺。調整橋面、田埂、樓梯或屋基時，同步核對畫面與步行高度。
- 可辨認的場景物件從 `public/models/` 載入。模型修改由 `art/` 的 Blender 來源、匯出流程及來源紀錄一起交接。
- 為使用者保留鍵盤、觸控、操作說明與返回入口。介面變更至少在桌面和窄螢幕檢查景點導覽。
- 測試步行可用 `?trace-walk` 從畫布的 `data-walk-position` 讀取相機世界座標。材質比對可用 `?splats=off` 關閉 Gaussian 細節層，或以 `?trace-splats` 取得各圖層可見實例數。場景切換會釋放離場場景的資源，模型載入維持各場景自行擁有素材。
- 提示詞原稿在 `prompts/`。保留正式建置的 `dist/` 供本機交付，提交以來源和可重建的素材為主。
