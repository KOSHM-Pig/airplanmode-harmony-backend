import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from "../src/config/database.js";
import Airport from '../src/models/Airport.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const airportsDir = __dirname; // 定义 airportsDir 变量

const regionMap = {
  'africa': '非洲',
  'antarctica': '南极洲',
  'arctic': '北极',
  'asia_europe': '亚洲/欧洲',
  'china': '中国',
  'easter_egg': '彩蛋',
  'middle_east': '中东',
  'military_special': '军事/特殊',
  'north_america': '北美洲',
  'oceania': '大洋洲',
  'south_america': '南美洲',
  'south_asia': '南亚',
  'usa': '美国',
};

// 获取 airports 子目录下的所有 json 文件
const files = await fs.readdir(airportsDir);
const jsonFiles = files.filter(file => path.extname(file) === '.json');
console.log(jsonFiles);

// 遍历数组 每个文件一行一行读取 并插入到数据库
jsonFiles.forEach(async (file) => {
  const filePath = path.join(airportsDir, file);
  const data = await fs.readFile(filePath, 'utf8');
  const jsonData = JSON.parse(data); // 解析整个文件内容
  const airports = jsonData.airports; // 获取 airports 数组
  
  if (!airports || !Array.isArray(airports)) {
    console.error(`Error: 'airports' array not found or not an array in ${file}`);
  }
  
  const fileNameWithoutExt = path.basename(file, '.json');
  const regionKey = fileNameWithoutExt.replace('_airports', '');
  const region = regionMap[regionKey] || '未知地区';
  
  for (const airportData of airports) { // 遍历 airports 数组
    try {
      await Airport.create({
        ...airportData,
        region
      });
    } catch (error) {
      console.error(error);
    }
  }
  console.log(`完成导入 ${region} 的 ${airports.length} 个机场数据`);
});