# Givros × 二次元動畫 3D 場景提示詞包（10 組）

版本：2.0｜適用：`$givros-environment-builder`、Blender 建模、glTF/GLB、Three.js 可探索場景。

## 如何使用

1. 選擇 `prompts/` 內一份 `.md`：**每份都是完全獨立、包含共用規格的完整英文提示詞**。
2. 將內容貼給具有 `$givros-environment-builder` 技能與所需 Blender/專案工具的 Agent。
3. 如果要忠於既有構圖，附上原始參考圖；沒有參考圖仍可按各場景設定設計，但 Agent 不得宣稱已完成影像比對。
4. 讓 Agent 依技能流程產出地形、Blender 來源、GLB、Three.js 可玩地圖，以及完整審核。
5. `00_SHARED_MASTER.md` 是共用核心，**單獨使用時需搭配某組場景設定**；不必在完整提示詞前再貼一次共用檔。

## 提示詞關鍵規則

- 二次元動漫背景美術風格，**但確實 3D 可走動，不是平面圖片或場景貼片**。
- `$givros-environment-builder` 掌管技術實作與地圖規劃。
- Three.js 不可用盒子、球體、圓柱或線段偽裝完成的房屋、樹、鳥居、橋、石燈籠等。
- Blender 或授權資產庫製作可辨識的真正 3D 模型，匯入 Three.js；允許 proper LOD / instancing。
- 遊戲世界需有參考圖範圍外的後院、山徑、河道、林地；具完整導航、碰撞、場景後側。
- 每組場景有 **唯一固定光照**；未指定動態日夜。
- Agent 不得聲稱未實際生成的檔案或跑過的測試。

## 場景清單

- `01_sakura_mountain_village.md`：春櫻山村｜Spring Sakura Mountain Village
- `02_summer_riverside_valley.md`：盛夏溪谷村｜Summer Riverside Valley
- `03_bamboo_forest_shrine.md`：竹林神社秘徑｜Bamboo Forest Shrine Path
- `04_rice_terrace_farming_village.md`：水田梯田農村｜Rice Terrace Farming Hamlet
- `05_autumn_maple_post_village.md`：紅葉山道宿場村｜Autumn Maple Mountain Hamlet
- `06_cedar_mountain_temple.md`：杉林山寺與岩壁｜Cedar Mountain Temple Trail
- `07_winter_snow_onsen_hamlet.md`：雪國溫泉山村｜Winter Snow Onsen Hamlet
- `08_seaside_fishing_village.md`：海岬漁村｜Seaside Fishing Hamlet
- `09_mountain_lake_village.md`：山中湖畔聚落｜Mountain Lake Village
- `10_summer_festival_village.md`：夏祭燈籠山村｜Summer Festival Village

## 注意

提示詞能約束目標與流程，**不能單靠文字保證一次產出完整可玩遊戲地圖**。實際完成程度取決於 Givros skill、Blender、Three.js 工程、資產來源/授權、硬體與 Agent 的工具權限。動漫風格是新美術選擇，因此若來源圖為寫實風，素材建模可參照原圖構圖，但渲染外觀依本包改為動漫美術。

## 可檢查的交付清單

- [ ] 可運行/控制角色的 Three.js 工程；地圖所有主要點位可到達
- [ ] 真正可見 3D 資產及 Blender 來源 / GLB 匯出
- [ ] 地形、河流或湖海、水渠以及真實地理相容性
- [ ] 參考構圖相符（如已提供參考圖）
- [ ] 非重複 placeholder 幾何體審核
- [ ] LOD、碰撞、玩家高度截圖、效能資料（若有量測）
- [ ] 缺少與未驗證部分明確列出
