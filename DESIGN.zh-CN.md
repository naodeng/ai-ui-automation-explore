---
name: AI UI Automation Explore
description: 面向合成 UI 自动化研究的清晰、可核验界面。
colors:
  primary: "#17664f"
  primary-deep: "#124d3d"
  positive-pale: "#eaf3ee"
  warning: "#a64624"
  warning-pale: "#fff2eb"
  ground: "#f4f5f1"
  surface: "#ffffff"
  ink: "#17221f"
  muted: "#59645e"
  line: "#e4e8e2"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "clamp(30px, 3vw, 40px)"
    fontWeight: 690
    lineHeight: 1.12
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 670
  amount:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "30px"
    fontWeight: 710
    lineHeight: 1
    letterSpacing: "-0.04em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "12px"
  panel: "16px"
  panel-mobile: "14px"
  pill: "999px"
spacing:
  sm: "12px"
  md: "16px"
  lg: "22px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    height: "50px"
  select-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "48px"
  status-chip:
    backgroundColor: "#f3f8f4"
    textColor: "{colors.primary-deep}"
    rounded: "{rounded.pill}"
    padding: "8px 11px"
---

# Design System: AI UI Automation Explore

## Overview / 概述

**Creative North Star: "Calm Verification / 平静而可核验"**

界面让合成业务结果一眼可检查。温和的中性色背景、白色描边面板、简洁标签和清晰的字号层级，为操作者留出比较状态和金额的空间，同时避免把 Demo 做成真实商城。

深绿用于主要操作和正向观察；陶土色标记 Gold/Silver 生命周期操作与待核实状态。E1 结算页、已确认的 M1 状态总览稿与 S1 秒杀验证台共用这套视觉系统。M1 将契约预期与本地观察分开；优惠券过期时间未知时，界面明确保留未知状态。S1 分开展示五种库存桶，在只读 Oracle 旁展示 Fake Clock，并将购买标为合成操作；队列规则未定义时，页面直接说明未模拟队列。

**Key Characteristics / 关键特征：**
- 克制、温和的中性工作界面。
- 深绿表示主要操作和正向观察；陶土色表示生命周期操作与待核实条件。
- 清楚区分合成沙盒操作与真实商业流程。
- 契约预期检查与独立本地 Run 的观察结果分别呈现。

## Colors / 颜色

用颜色区分操作、正向结果和未满足条件，同时让页面主体保持中性。

### Primary / 主色
- **深绿：**用于主要按钮和优惠券已应用状态。
- **深绿暗色：**用于按钮悬停和高强调文字。
- **浅绿：**用于焦点环和正向状态的辅助背景。

### Secondary / 次色
- **陶土色：**用于未达到优惠门槛等警示状态。
- **浅陶土色：**用于低强调警示和优惠券区域。

### Neutral / 中性色
- **温和中性背景：**页面主背景。
- **白色表面：**结算面板和表单控件。
- **墨色：**主要文字和应付总额。
- **灰绿文字：**说明文字和次要标签。
- **浅灰绿线条：**分隔线、输入框边框和面板轮廓。

**The Outcome-First Color Rule / 结果优先配色规则。**只有合成业务状态为正向或表示主要操作时才使用绿色。未满足条件时使用陶土色；强调色不能暗示真实付款或权益。

## Typography / 字体

- **Display Font：**Inter 与项目系统无衬线回退字体。
- **Body Font：**使用相同的 UI 无衬线字体栈。
- **Label/Mono Font：**没有单独的标签字体或等宽字体。

**Character / 字体特征：**字形紧凑、中性。页面标题和应付总额通过更大的尺寸与字重建立重点，列表和摘要保留较小的可扫读标签。

### Hierarchy / 层级
- **Display：**字重 690，30–40px，行高 1.12；仅用于页面标题。
- **Title：**字重 690，16px；用于面板标题。
- **Amount：**字重 710，桌面 30px、390px 窄屏 28px，启用等宽数字；用于应付总额。
- **Body：**字重 400，14px，行高 1.7；简短说明可用 13px。
- **Label：**字重 670–720，13px；用于表单标签、步骤和优惠券状态。

**The Amount Legibility Rule / 金额易读规则。**应付金额应突出显示，并使用等宽数字对齐。标题与金额的字距不得紧于 -0.04em。

## Layout / 布局

E1 页面将结算区域居中放入有最大宽度的容器。桌面采用较宽的商品与优惠栏，旁边放较窄的金额摘要栏。宽度不超过 800px 时，改为商品在前、摘要在后的单栏布局；不超过 480px 时，容器两侧留 16px 空间，并缩小面板圆角。

布局采用适中的间距和宽裕的面板内边距，让商品、优惠券、金额汇总和主要操作容易分别扫读。窄屏上应同时看见所选金额及其应付总额。

M1 使用有最大宽度的状态总览：会员状态和两个场景操作位于较宽主栏；历史优惠券与只读 Oracle 位于侧栏；预期检查跨栏放在下方。宽度不超过 900px 时主栏堆叠，优惠券与 Oracle 在 560px 以上并排；窄屏使用双列状态网格和单列侧面板。

## Elevation & Depth / 层次与深度

面板仅用细边框表达轮廓。主要按钮是页面里唯一抬高的控件，静止和悬停时使用柔和的绿色阴影。下拉框获得键盘焦点时显示浅绿色焦点环。不要在面板边框下再叠加大面积阴影。

**The One-Elevation Rule / 单一层次规则。**面板用边框分隔；阴影只用于需要抬高的操作控件。

## Shapes / 形状

表面采用柔和圆角，内容面板不使用胶囊形。桌面面板使用较大的圆角，窄屏下缩小。输入框和主按钮使用紧凑圆角；优惠券卡片略柔和。只有小型状态标签使用完整胶囊形。

## Components / 组件

### Buttons / 按钮
主操作是绿色实心按钮，悬停时轻微上移。
- **形状：**紧凑圆角，最小高度 50px。
- **主按钮：**全宽、绿色背景、白色文字。
- **悬停 / 焦点：**悬停时转为更深的绿色，并保留清晰的键盘焦点轮廓。
- **禁用：**降低不透明度，并移除悬停上移效果。
- **M1 场景操作：**绿色表示升级夹具操作；陶土色描边表示降级操作。两者都创建独立内存 Run，不会创建购买。

### Chips / 状态标签
- **样式：**本地沙盒标签使用浅绿背景、深绿文字、细绿色边框和胶囊形。
- **状态：**用 CSS 圆点标记本地状态，含义由文字表达。

### Cards / Containers / 面板
- **圆角：**桌面较大，窄屏缩小。
- **背景：**白色，带安静的灰绿色描边。
- **阴影：**面板不使用阴影，由边框表达层次。
- **内边距：**标题行和内容行分开留白，保持阅读顺序。

### Inputs / Fields / 输入框
- **样式：**白色原生下拉框，使用中性边框和小型自绘 SVG 箭头。
- **焦点：**绿色边框和浅绿色焦点环。
- **错误 / 禁用：**下拉框保持可用，当前门槛状态显示在控件旁。

### Navigation / 导航
- **样式：**三步结算流程使用编号圆圈，当前步骤填充绿色；窄屏上仍保持横向排列。

### Coupon Status / 优惠券状态
优惠券卡片将规则与当前状态放在同一行。
- **已应用：**条件满足时用绿色状态文字。
- **未达门槛：**用陶土色状态文字并显示还差金额。
- **形状：**暖色调表面、细边框和紧凑圆角。
- **M1 历史优惠券：**Seed 起始时点的状态为有效。推进模拟时间后，由于没有具体到期时间，显示到期状态待核实。

### Oracle Observation / Oracle 观察
M1 侧栏显示服务端有效等级、授权观察、会员事件数量和优惠券账本状态。只读 Oracle 与场景操作控件保持视觉区分。

### Expected Checks / 预期检查
每条 M1 规则均保留“预期检查”标签。场景或重放运行后展示本地观察，同时保留合成 Run 与外部系统结论之间的边界。

## Do's and Don'ts / 约定

### Do / 应该：
- **Do：**用既定的绿色和陶土色区分状态结果。
- **Do：**用等宽数字显示金额，并突出应付总额。
- **Do：**在主要操作附近说明仅本地运行、不会付款。
- **Do：**区分 Seed 时点的优惠券观察与之后的到期状态。
- **Do：**让本地观察结果与契约预期保持明确区分。

### Don't / 避免：
- **Don't：**不要在面板边框上再叠加大面积阴影。
- **Don't：**不要用字符代替界面图标；简单圆点用 CSS，选择箭头用 SVG。
- **Don't：**标题和金额字距不要紧于 -0.04em。
- **Don't：**不要让合成结算文案暗示真实扣款或履约。
- **Don't：**不要声称 Demo 未观察到的 M1 优惠券到期时间或传播延迟。
- **Don't：**不要暗示本地授权探测会创建 Gold-only 购买。
