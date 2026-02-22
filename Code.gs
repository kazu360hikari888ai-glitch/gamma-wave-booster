function doGet() {
  return HtmlService.createHtmlOutputFromFile('index.html')
    .setTitle('ガンマ波ブースター (Gamma Wave Booster Pro)')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT)  // セキュリティ修正: ALLOWALLはクリックジャッキングリスクがあるため変更
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}
