import React, { useState, useEffect, useRef } from 'react';
import { saveAs } from 'file-saver';
import './App.css';

const App = () => {
  // 明度映射表（精确到小数点后两位）
  const brightnessMap = new Map([
    [0, 0], [5, 1.17], [10, 2.27], [15, 3.28], [20, 5.43],
    [25, 7.83], [30, 9.79], [35, 13.07], [40, 16.81], [45, 19.66],
    [50, 23.91], [55, 26.79], [60, 33.25], [65, 35.42], [70, 41.13],
    [75, 47.82], [80, 53.88], [85, 59.63], [90, 66.01], [95, 75.42],
    [100, 90.71]
  ]);

  // 状态管理
  const [logs, setLogs] = useState([]);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(50);
  const [brightness, setBrightness] = useState(50);
  const [lightness, setLightness] = useState(50);
  const [colorPool, setColorPool] = useState([]);
  const colorPoolRef = useRef([]);
  const [leftHue, setLeftHue] = useState(0);
  const [leftSaturation, setLeftSaturation] = useState(50);
  const [leftBrightness, setLeftBrightness] = useState(50);
  const [count, setCount] = useState(0);
  const [operationLogs, setOperationLogs] = useState([]);

  const totalIterations = 121;

  // HSB转HSL函数（保持不变）
  function hsbToHsl(h, s, b) {
    h /= 360;
    s /= 100;
    b /= 100;

    const l = (2 - s) * b / 2;
    const sl = l < 0.5 ? s * b / (l * 2) : s * b / (2 - l * 2);

    return {
      h: h * 360,
      s: sl * 100,
      l: l * 100,
    };
  }

  // 创建颜色池（121色）
  function createColorPool() {
    const saturationLevels = Array.from({length: 11}, (_, i) => i * 10);
    const brightnessLevels = Array.from({length: 11}, (_, i) => i * 10);
    let colors = [];

    brightnessLevels.forEach(v => {
      saturationLevels.forEach(s => {
        colors.push({
          h: Math.random() * 360,    // 随机色相
          s: s,                      // 0-100，步长10
          v: v,                      // 0-100，步长10
          darkV: brightnessMap.get(v)// 映射后的暗模式明度
        });
      });
    });

    return colors.sort(() => Math.random() - 0.5); // 打乱顺序
  }

  // 获取下一个颜色
  const getNextColor = () => {
    if (colorPoolRef.current.length === 0) return null;
    const nextColor = colorPoolRef.current.shift();
    setColorPool([...colorPoolRef.current]);
    return nextColor;
  };

  // 饱和度改变处理
  const handleSaturationChange = (event) => {
    const newSaturation = parseFloat(event.target.value);
    setSaturation(newSaturation);
    setOperationLogs([...operationLogs, { type: 'S', value: newSaturation }]);
  };

  // 提交处理
  const handleSubmit = () => {
    const newLog = {
      iteration: count + 1,
      baseHue: leftHue,
      baseSaturation: leftSaturation,
      baseBrightness: leftBrightness,
      adjustedSaturation: saturation,
      darkBrightness: brightnessMap.get(leftBrightness),
      operations: operationLogs.map(op => `${op.type}:${op.value.toFixed(2)}`).join(', ')
    };

    setLogs([...logs, newLog]);
    setCount(count + 1);
    setOperationLogs([]);

    // 完成所有实验时导出
    if (count + 1 === totalIterations) {
      const csvData = generateCSV(logs);
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
      saveAs(blob, `saturation-study-${Date.now()}.csv`);
      alert('实验完成，数据已保存');
      window.close();
    } else {
      updateColors();
    }
  };

  // 更新颜色显示
  const updateColors = () => {
    const color = getNextColor();
    if (color) {
      // 明模式参数
      setLeftHue(color.h);
      setLeftSaturation(color.s);
      setLeftBrightness(color.v);

      // 暗模式初始参数
      setHue(color.h);
      setSaturation(50); // 初始饱和度50%
      setBrightness(color.darkV);
      setLightness(hsbToHsl(color.h, 50, color.darkV).l);
    }
  };

  // 生成CSV数据
  const generateCSV = (data) => {
    const header = [
      '序号',
      '基础色相',
      '基础饱和度',
      '基础明度',
      '调整后饱和度', 
      '暗模式明度',
      '操作记录'
    ];
    
    const rows = data.map(log => [
      log.iteration,
      log.baseHue.toFixed(2),
      log.baseSaturation.toFixed(2),
      log.baseBrightness.toFixed(2),
      log.adjustedSaturation.toFixed(2),
      log.darkBrightness.toFixed(2),
      log.operations
    ]);

    return [header, ...rows].map(e => e.join(",")).join("\n");
  };

  // 初始化颜色池
  useEffect(() => {
    const initialColorPool = createColorPool();
    colorPoolRef.current = [...initialColorPool];
    setColorPool([...initialColorPool]);
    updateColors();
  }, []);

  // 保持原有布局结构
  return (
    <div style={{ width: '1920px', height: '1080px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 3, display: 'flex' }}>
        {/* 左侧明模式显示 */}
        <div style={{ flex: 1, backgroundColor: [hsbToHsl(240, 2, 11).h, hsbToHsl(240, 2, 11).s, hsbToHsl(240, 2, 11).l], display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            backgroundColor: `hsl(${leftHue}, ${leftSaturation}%, ${hsbToHsl(leftHue, leftSaturation, leftBrightness).l}%)` 
          }} />
        </div>
        
        {/* 右侧暗模式显示 */}
        <div style={{ flex: 1, backgroundColor: [hsbToHsl(240, 3, 97).h, hsbToHsl(240, 3, 97).s, hsbToHsl(240, 3, 97).l], display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)` 
          }} />
        </div>
      </div>

      {/* 控制面板（保持原有DOM结构） */}
      <div style={{ height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor:'#eeeeee' }}>
        <div className="progressBarContainer" style={{ width: '100%', marginBottom: '10px' }}>
          <div className="progressBar" style={{ 
            width: `${(count / totalIterations) * 100}%`, 
            height: '10px', 
            backgroundColor: '#4caf50' 
          }} />
        </div>

        <div className="container">
          <span className="label">S: 饱和度</span>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={saturation} 
            onChange={handleSaturationChange} 
            step="0.1"
            className="slider sliderSaturation" 
          />
          <span className="valueDisplay">{saturation.toFixed(1)}%</span>
        </div>

        <div className="buttonsContainer">
          <button onClick={handleSubmit} className="button">保存</button>
          <span style={{ marginLeft: '10px', marginRight: '10px' }}>
            实验次数: {count + 1}/{totalIterations}
          </span>
        </div>
      </div>
    </div>
  );
};

export default App;
