# 👸 おひめさまの とうのぼり

4〜6歳のお子さま向けブラウザゲームです。

## 🎮 あそびかた

- **タップするだけ！** 画面をタップするとお姫様がジャンプします
- ⭐❤️ を集めながら、20階のてっぺんを目指そう！
- 👾 敵がいたら **消えるまで待って** からタップ！
- ❤️ ライフは3つ。敵に当たると1つ減って1段戻ります
- ライフが0になるとゲームオーバー

## 📁 ファイル構成

```
princess-tower/
├── index.html      ← メインHTML
├── style.css       ← スタイルシート
├── game.js         ← ゲームロジック
├── README.md       ← このファイル
└── images/
    ├── player.png   ← お姫様（プレイヤー）
    ├── tower.jpg    ← 塔の背景
    ├── witch.png    ← 魔女（敵）
    ├── thugs.png    ← 盗賊（敵）
    ├── dragon.png   ← ドラゴン（敵）
    └── gondola.png  ← ゴンドラ（ゴール）
```

## 🚀 GitHub Pagesで公開する方法

1. このリポジトリをGitHubにアップロード
2. **Settings** → **Pages** を開く
3. **Source** を `Deploy from a branch` に設定
4. **Branch** を `main`、フォルダを `/ (root)` に設定して **Save**
5. 数分後に `https://あなたのユーザー名.github.io/princess-tower/` で公開！

## 🎨 カスタマイズ

### 難易度調整（game.js）
- `TOTAL` — ゴールまでの段数（初期値: 20）
- `ENEMY_STAY` — 敵がいる時間（初期値: 70フレーム）
- `ENEMY_GONE` — 敵がいない時間（初期値: 200フレーム）
- `INV_TIME` — 敵に当たった後の無敵時間（初期値: 90フレーム）
