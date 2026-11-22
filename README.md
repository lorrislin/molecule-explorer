# 小貿老師給阿陶阿墨的分子探險教室

給國中生用的立體分子模型。在手機或平板上，用一根手指轉動分子、兩根手指放大縮小，點一下原子就能看到它的中文名字和一句說明。

內建的分子：水 H₂O（打開就是它）、二氧化碳、氧氣、氫氣、氮氣、甲烷、氨、乙醇、葡萄糖、食鹽（一小塊晶格），還有咖啡因。模型是球棍模型，顏色用常見的 CPK 配色：氧紅、氫白、碳深灰、氮藍、鈉紫、氯綠。

小分子的鍵角是照教科書來的，例如水約 104.5°、甲烷約 109.5°、氨約 107°、二氧化碳 180°。葡萄糖是椅子形的環，食鹽是 3×3×3 的氯化鈉晶格（短棒只是幫你看出誰跟誰相鄰，不是共價鍵）。不需要後端，也不需要 API 金鑰。

## 本機執行

需要 Node.js 18 以上。

```bash
npm install
npm run dev
```

瀏覽器打開 [http://localhost:3000](http://localhost:3000)。

其他指令：

```bash
npm test          # 檢查鍵角、原子數量、有沒有原子疊在一起
npm run typecheck
npm run lint
npm run build
npm start
```

技術跟 [calligraphy-calendar](https://github.com/lorrislin/calligraphy-calendar) 一樣：Next.js 14、React 18、TypeScript。立體畫面用 three.js 和 react-three-fiber。

## 部署到 Vercel

1. 把這個 GitHub repo 匯入 Vercel，Framework 選 **Next.js**（它會自動偵測）。
2. 不需要設定環境變數。
3. 直接 Deploy。之後推上 `main` 就會自動重新部署。

手機裝到主畫面時，建議用 Safari 的「加入主畫面」，畫面會更像一個獨立 App。為了讓雙指縮放作用在分子上、而不是把整個網頁放大，頁面本身關掉了瀏覽器縮放。
