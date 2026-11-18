---
name: valley-scene-workflow
description: Build or refine walkable Three.js worlds in this repository using editable Blender assemblies, seeded landscape placement, and play-through screenshots. Use for new landmarks, vegetation, terrain or scenic routes.
---

# 十景漫步場景製作

1. 讀取 `prompts/` 的對應原稿並確認授權可用的參考圖。先選玩家能走到的鏡位，決定前景、中景地標和遠山，再安排入口、路線和停留點。春櫻山村以 `src/world/layout.js` 的公尺座標為準。其他場景查 `src/world/regions/`。
2. 在 Blender 以 Z 向上製作獨立構件。草叢可分草葉與草穗，花灌木可分枝條、葉和花，樹木可分主幹、側枝和葉簇。地面錨點設於原點，保留可編輯的集合及材質，再匯出 Y 向上的 GLB。參考 `art/build_valley.py`、`art/valley-library.blend` 和 `art/README.md` 的重建方式。
3. 在 Three.js 用固定亂數種子安排密度、比例和角度。沿田埂與溪岸作成疏密變化的群聚。用 `groundAt` 貼地，避開路心、田水和建物。將相同的 GLB 分塊實例化，在遠處用低成本模型，優先保留近景的葉片輪廓。枝葉可用 `gaussianKind` 加入既有的程序 Gaussian 細節。用相同鏡位對照 `?splats=off`，檢查遮蔽和透明邊緣。
4. 核對草葉與裝飾件不妨礙步行，並同步更新可阻擋的樹幹、階梯、橋面和水岸高度。以 `?trace-walk` 讀取相機座標，確認入口到地標可用鍵盤和觸控抵達。
5. 從專案根目錄執行 `npm test`、`npm run build` 和 `npm run smoke`。用 `test-results/` 裡的實拍檢查玩家眼高的構圖、物件接地與窄螢幕導覽。素材改動應一起提供建模來源、`.blend`、GLB 與可重建命令。
6. 地標烘焙保留既有 Weathering UV0，Cycles AO 使用獨立 UV1。依 `art/baked-landmarks.md` 重建與檢查來源和匯出，先以 `lighting=legacy` 同鏡位對照，再用 `ao=off` 確認接縫特徵。從正式建置執行 `npm run compare:lighting` 保存實拍，並驗證觸控步行、日景高光與夜景暗部。
