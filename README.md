# usc-arch.github.io

USC 建築系官方網站原始碼。

- 線上網址：https://usc-arch.github.io/
- 部署方式：推送到 `main` 分支後由 GitHub Pages 自動發布，無建置步驟。

## 本機預覽

```bash
python3 -m http.server 8000
```

然後開啟 http://localhost:8000

## 注意

本 repo 使用 `usc-arch` 帳號，remote 走 SSH alias `github-dept`。
確認身分：

```bash
git config user.email   # 應為 arch@g2.usc.edu.tw
git remote -v           # 應為 git@github-dept:...
```
