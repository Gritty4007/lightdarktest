import React, { useState, useEffect, useRef } from 'react';
import { saveAs } from 'file-saver';
import './App.css';

const App = () => {
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
  const [progress, setProgress] = useState(0);
  const [count, setCount] = useState(0);
  const [backgrounds, setBackgrounds] = useState([]);
  const [currentBackground, setCurrentBackground] = useState({});
  const [currentGroup, setCurrentGroup] = useState(0);
  const [showRestPrompt, setShowRestPrompt] = useState(false);
  const [operationLogs, setOperationLogs] = useState([]);

  const maxIterationsPerGroup = 54;

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

  function createColorPool() {
    const hues = [60, 120, 180, 240, 300, 360];
    const saturations = [33.3, 66.7, 99.9];
    const brightnesses = [33.3, 66.7, 99.9];
    let colors = [];

    for (let h of hues) {
      for (let s of saturations) {
        for (let b of brightnesses) {
          colors.push({ h, s, b });
        }
      }
    }

    console.log("Created colorPool:", colors); // 调试输出
    return [...colors]; // 确保返回深拷贝
  }

  function getRandomColor() {
    if (colorPoolRef.current.length === 0) {
      console.error("No colors left in the pool!");
      return null;
    }
    const randomIndex = Math.floor(Math.random() * colorPoolRef.current.length);
    const selectedColor = colorPoolRef.current[randomIndex];
    const updatedPool = colorPoolRef.current.filter((_, index) => index !== randomIndex);
    colorPoolRef.current = updatedPool; // 更新ref

    setColorPool([...updatedPool]); // 更新state，仅用于调试

    return selectedColor;
  }

  const handleSaturationChange = (event) => {
    const newSaturation = event.target.value;
    setSaturation(newSaturation);
    setOperationLogs([...operationLogs, { type: 'S', value: newSaturation }]);
  };

  const handleBrightnessChange = (event) => {
    const newBrightness = event.target.value;
    setLightness(hsbToHsl(hue, saturation, newBrightness).l);
    setBrightness(newBrightness);
    setOperationLogs([...operationLogs, { type: 'V', value: newBrightness }]);
  };

  const handleSubmit = () => {
    const newLog = {
      group: currentGroup + 1,
      iteration: count + 1,
      leftColor: `hsb(${leftHue}, ${leftSaturation}%, ${leftBrightness}%)`,
      rightColor: `hsb(${hue}, ${saturation}%, ${brightness}%)`,
      leftBackground: currentBackground.left,
      rightBackground: currentBackground.right,
      operations: operationLogs.map(op => `${op.type}:${op.value}`).join(', '),
    };

    const updatedLogs = [...logs, newLog];
    setLogs(updatedLogs);
    setCount(count + 1);
    setOperationLogs([]);

    if (count + 1 === maxIterationsPerGroup) {
      if (currentGroup < 5) {
        setShowRestPrompt(true);
      } else {
        const csvData = generateCSV(updatedLogs);
        const blob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
        saveAs(blob, "color-logs.csv");
        alert('All groups completed. Logs have been saved.');
        window.close();
      }
    } else {
      updateColors();
    }
  };

  const updateColors = () => {
    const color = getRandomColor();
    if (color) {
      setHue(color.h);
      setSaturation(color.s);
      setBrightness(color.b);
      setLightness(hsbToHsl(color.h, color.s, color.b).l);

      // 同步更新左侧色块
      setLeftHue(color.h);
      setLeftSaturation(color.s);
      setLeftBrightness(color.b);
    }
  };

  const generateCSV = (data) => {
    const header = ['Group', 'Iteration', 'Left Color', 'Right Color', 'Left Background', 'Right Background', 'Operations'];
    const rows = data.map(log => [
      log.group,
      log.iteration,
      log.leftColor,
      log.rightColor,
      log.leftBackground,  // 包含左边背景颜色
      log.rightBackground, // 包含右边背景颜色
      log.operations
    ]);

    const csvContent = [header, ...rows].map(e => e.join(",")).join("\n");
    return csvContent;
  };

  const handleExit = () => {
    const confirmExit = window.confirm('Are you sure you want to exit? All logs will be saved.');
    if (confirmExit) {
      const csvData = generateCSV(logs);
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
      saveAs(blob, "color-logs.csv");
      window.close();
    }
  };

  const handleReset = () => {
    setHue(leftHue);
    setSaturation(leftSaturation);
    setBrightness(leftBrightness);
    setLightness(hsbToHsl(leftHue, leftSaturation, leftBrightness).l);
  };

  const proceedToNextGroup = () => {
    const nextGroup = currentGroup + 1;
    setCurrentGroup(nextGroup);
    setCount(0);
    setShowRestPrompt(false);

    // 重新填充颜色池
    const newColorPool = createColorPool();
    console.log("Setting new colorPool:", newColorPool); // 调试输出
    colorPoolRef.current = [...newColorPool];
    setColorPool([...newColorPool]); // 仅用于调试

    if (backgrounds.length > nextGroup) {
      setCurrentBackground(backgrounds[nextGroup]);
      updateColors();
    }
  };

  useEffect(() => {
    // 初始化 colorPool 和颜色
    const initialColorPool = createColorPool();
    console.log("Initial colorPool:", initialColorPool); // 调试输出
    colorPoolRef.current = [...initialColorPool];
    setColorPool([...initialColorPool]); // 仅用于调试
    updateColors();

    const backgroundCombos = [
      // 原始三组
      { left: `hsl(${hsbToHsl(240, 2, 97).h}, ${hsbToHsl(240, 2, 97).s}%, ${hsbToHsl(240, 2, 97).l}%)`, right: `hsl(${hsbToHsl(240, 3, 11).h}, ${hsbToHsl(240, 3, 11).s}%, ${hsbToHsl(240, 3, 11).l}%)` },
      { left: `hsl(${hsbToHsl(240, 2, 97).h}, ${hsbToHsl(240, 2, 97).s}%, ${hsbToHsl(240, 2, 97).l}%)`, right: `hsl(${hsbToHsl(240, 3, 57).h}, ${hsbToHsl(240, 3, 57).s}%, ${hsbToHsl(240, 3, 57).l}%)` },
      { left: `hsl(${hsbToHsl(240, 3, 57).h}, ${hsbToHsl(240, 3, 57).s}%, ${hsbToHsl(240, 3, 57).l}%)`, right: `hsl(${hsbToHsl(240, 3, 11).h}, ${hsbToHsl(240, 3, 11).s}%, ${hsbToHsl(240, 3, 11).l}%)` },
      // 新增三组
      { left: `hsl(${hsbToHsl(240, 3, 57).h}, ${hsbToHsl(240, 3, 57).s}%, ${hsbToHsl(240, 3, 57).l}%)`, right: `hsl(${hsbToHsl(240, 2, 97).h}, ${hsbToHsl(240, 2, 97).s}%, ${hsbToHsl(240, 2, 97).l}%)` },
      { left: `hsl(${hsbToHsl(240, 3, 11).h}, ${hsbToHsl(240, 3, 11).s}%, ${hsbToHsl(240, 3, 11).l}%)`, right: `hsl(${hsbToHsl(240, 3, 57).h}, ${hsbToHsl(240, 3, 57).s}%, ${hsbToHsl(240, 3, 57).l}%)` },
      { left: `hsl(${hsbToHsl(240, 3, 11).h}, ${hsbToHsl(240, 3, 11).s}%, ${hsbToHsl(240, 3, 11).l}%)`, right: `hsl(${hsbToHsl(240, 2, 97).h}, ${hsbToHsl(240, 2, 97).s}%, ${hsbToHsl(240, 2, 97).l}%)` },
    ];

    const shuffledBackgrounds = backgroundCombos.sort(() => Math.random() - 0.5);
    setBackgrounds(shuffledBackgrounds);
    setCurrentBackground(shuffledBackgrounds[0]);
  }, []);

  return (
    <div style={{ width: '1920px', height: '1080px', display: 'flex', flexDirection: 'column' }}>
      {showRestPrompt ? (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
          <h2>请休息片刻</h2>
          <button onClick={proceedToNextGroup} className="button">继续下一组实验</button>
        </div>
      ) : (
        <>
          <div style={{ flex: 3, display: 'flex' }}>
            <div style={{ flex: 1, backgroundColor: currentBackground.left, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ width: '60px', height: '60px', backgroundColor: `hsl(${leftHue}, ${leftSaturation}%, ${hsbToHsl(leftHue, leftSaturation, leftBrightness).l}%)` }} />
            </div>
            <div style={{ flex: 1, backgroundColor: currentBackground.right, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ width: '60px', height: '60px', backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)` }} />
            </div>
          </div>
          <div style={{ height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor:'#eeeeee' }}>
            <div className="progressBarContainer" style={{ width: '100%', marginBottom: '10px' }}>
              <div className="progressBar" style={{ width: `${(count / maxIterationsPerGroup) * 100}%`, height: '10px', backgroundColor: '#4caf50' }} />
            </div>
            <div className="container">
              <span className="label">H:色调</span>
              <input type="range" min="0" max="360" value={hue} className="slider sliderHue" disabled />
              <span className="valueDisplay">{hue}</span>
            </div>
            <div className="container">
              <span className="label">S:饱和</span>
              <input type="range" min="0" max="100" value={saturation} onChange={handleSaturationChange} step='0.1' className="slider sliderSaturation" />
              <span className="valueDisplay">{saturation}</span>
            </div>
            <div className="container">
              <span className="label">B:亮度</span>
              <input type="range" min="0" max="100" value={brightness} onChange={handleBrightnessChange} step='0.1' className="slider sliderLightness" />
              <span className="valueDisplay">{brightness}</span>
            </div>
            <div className="buttonsContainer">
              <button onClick={handleSubmit} className="button">保存</button>
              <button onClick={handleExit} className="button">退出</button>
              <button onClick={handleReset} className="button">重置</button>
              <span style={{ marginLeft: '10px', marginRight: '10px' }}>组数: {currentGroup + 1} | 次数: {count + 1}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
