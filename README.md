# Three.js 点云图

https://molar.yuque.com/oim2it/tydouy/yghb2x?singleDoc=#J2gL1

1. 绘制闭合的曲线
    - 2D ↔ 3D 坐标转换 转为NDC坐标计算
2. 3D 的点投影到 2D 平面，判断是否在闭合的曲线内
    - 先判断在哪个区块
    - 相机外的区块跳过计算
    - 判断套索多边形和区块边界是否有交汇
    - 如果套索包含了整个区块，整个区块整体处理
    - 如果存在多个需要精确到点的，全放到 web worker 同时进行



