---
description: vibepin · 在当前项目启动省 token 的文件 watcher 循环
---
监听本项目的 vibepin inbox,标注到达就实现 —— 用省 token 的方式。
不要调用 `watch_annotations` MCP 工具(它是模型轮询,空闲也烧 token)。

前提:本项目已把 vibepin 作为依赖安装(`npx vibepin` 能解析到)。

按下面做,然后循环:

1. 用**后台任务**(run_in_background: true)启动,不要阻塞本轮:
   `npx vibepin watch`
   (默认监听 `./.vibepin/inbox.jsonl`。)启动后本轮就结束,把输入权还给我。

2. 当这个后台进程退出(说明来了新标注),运行:
   `npx vibepin claim`
   它会打印一个 JSON 数组,逐条实现:
   - `kind: "element"`:优先用 `component`+`source`(React)定位组件文件;没有就用 `selector`/`html`/`styles`。
   - `kind: "region"`:用 `rect` + `elements`(框内的组件列表)。
   改完简要说一句改了什么、动了哪些文件。

3. 再次用后台任务挂上第 1 步的 `npx vibepin watch`,然后结束本轮。

watcher 在后台阻塞时你处于空闲、不花 token。其间我可能直接打字提别的需求(Node/utils/任何),
正常处理即可,处理完确认 watcher 还挂着(没有就重新挂)。

停止:杀掉后台的 watch 任务即可。

> 发行副本。要在任意项目用 `/vpin`,拷到 `~/.claude/commands/vpin.md`(命令是全局工具配置,
> 不进你的项目 repo)。项目侧只需 `npm i -D vibepin`,repo 保持干净。
