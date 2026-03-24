# Lenormand Academy MVP (Phase 1)

这是第一阶段可运行的正式产品工程版，核心覆盖：

- 账号与权限系统
- 个人案例库
- 投稿到共享案例库审核池
- 管理员审核通过后公开到共享案例库
- 每通过 1 个投稿，自动给该学员增加 1 天阅读权限
- 付费学员长期可读共享案例库

## 技术栈

- Next.js 15
- React 19
- Prisma
- PostgreSQL
- JWT Cookie 登录

## 先准备什么

1. Node.js 20+
2. PostgreSQL 数据库
3. 一个随机的 `JWT_SECRET`

## 启动步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，并填写：

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/lenormand"
JWT_SECRET="replace-with-a-long-random-secret"
```

### 3. 推送数据库结构

开发阶段可先用：

```bash
npm run db:push
```

或者用迁移：

```bash
npm run db:migrate
```

### 4. 写入种子数据

```bash
npm run db:seed
```

### 5. 启动本地开发环境

```bash
npm run dev
```

打开：

```text
http://localhost:3000
```

## 默认账号

- 管理员：`admin` / `admin2024`
- 普通学员：`student01` / `student2024`
- 付费学员：`paid01` / `paid2024`

## 当前已完成的业务流

### 学员端
- 登录
- 新增个人案例
- 编辑个人案例
- 删除个人案例
- 投稿共享案例库
- 查看自己的投稿状态
- 查看共享案例库（受权限控制）

### 管理员端
- 创建账号
- 查看账号列表
- 查看投稿审核池
- 审核通过投稿
- 驳回投稿

## 审核通过后的逻辑

管理员点击“审核通过 +1 天”后，系统会：

1. 把投稿状态改为 `APPROVED`
2. 复制该案例内容进入 `SharedCase`
3. 给投稿用户的 `sharedAccessUntil` 增加 1 天
4. 写入 `AccessReward` 奖励记录

## 现阶段还没做的

这版已经具备 MVP 跑通能力，但还没做：

- 忘记密码 / 重置密码
- 管理员手动增减阅读天数
- 用户禁用 / 启用
- 附件上传
- 搜索与筛选
- 支付接入
- 多语言 / 手机端深度优化
- 审核日志页面

## 最推荐的上线方式

### 方案 A：Vercel + Neon/Supabase Postgres

适合最快上线。

### 方案 B：Railway / Render

也可以，数据库与应用统一托管更方便。

## 部署前注意

1. 生产环境一定要更换默认密码
2. 生产环境一定要换成高强度 `JWT_SECRET`
3. 建议给管理员账号单独设置强密码
4. 目前是基础 JWT Cookie 方案，后续可以升级成更完整的权限中台或 NextAuth
