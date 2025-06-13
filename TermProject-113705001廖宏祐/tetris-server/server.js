const express = require('express');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')));

// 排行榜 API
app.get('/rank', (req, res) => {
  const data = JSON.parse(fs.readFileSync('rank.json'));
  const top10 = data.sort((a, b) => b.score - a.score).slice(0, 10);
  res.json(top10);
});

app.post('/rank', (req, res) => {
  try {
    const newEntry = req.body;
    console.log("收到資料：", newEntry);

    const data = JSON.parse(fs.readFileSync('rank.json'));
    data.push(newEntry);
    fs.writeFileSync('rank.json', JSON.stringify(data, null, 2));
    res.status(201).json({ message: '儲存成功', entry: newEntry });
  } catch (err) {
    console.error("儲存失敗：", err); 
    res.status(500).json({ message: '儲存失敗', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.use((req, res, next) => {
  console.log(`💡 收到請求：${req.method} ${req.url}`);
  next();
});