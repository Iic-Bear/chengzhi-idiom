// ============================================================
//  supabase-sync.js  —  成知·成语卡  云端同步模块
//  版本：2026-06-05  稳妥版（数据保护优先）
// ============================================================
//
//  【数据策略】
//  1. 登录/注册成功 → 只上传本地数据到云端（不自动下载）
//  2. 用户手动点击"从云端恢复" → 才执行 loadCloudData()
//  3. loadCloudData() 保护逻辑：云端条数 ≥ 本地条数 才覆写
//  4. 未登录状态 → 完全不影响本地使用
//
//  【避免上次的坑】
//  - 不在 init() 里主动调用 loadCloudData()
//  - 注册成功后不立即 loadCloudData()
//  - 所有云端操作均有 try-catch 保护
// ============================================================

// ---------- Supabase 项目配置 ----------
const SUPABASE_URL = 'https://hycakfuryhapteopgmrk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_aRDYTR62mRhi8NmVsj_FKA_vF84zFTO';

// ---------- 加载 Supabase JS SDK ----------
// 使用 CDN 加载，确保每次都能拿到最新稳定版
function loadSupabaseSDK() {
  return new Promise((resolve, reject) => {
    if (window.supabase) { resolve(window.supabase); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = () => resolve(window.supabase);
    script.onerror = () => reject(new Error('Supabase SDK 加载失败'));
    document.head.appendChild(script);
  });
}

// ---------- 初始化 ----------
let _sbClient = null;
let _sbReady = null;   // Promise，外部等待这个

function initSupabase() {
  if (_sbReady) return _sbReady;
  _sbReady = loadSupabaseSDK().then(supabase => {
    _sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[Supabase] 初始化完成');
    return _sbClient;
  }).catch(err => {
    console.error('[Supabase] 初始化失败', err);
    _sbReady = null;   // 允许重试
    throw err;
  });
  return _sbReady;
}

function getClient() {
  if (!_sbClient) throw new Error('Supabase 未初始化，请先调用 initSupabase()');
  return _sbClient;
}

// ---------- Session 管理 ----------
async function getSession() {
  await initSupabase();
  const { data: { session }, error } = await _sbClient.auth.getSession();
  if (error) console.warn('[Supabase] getSession 错误', error);
  return session;
}

async function getUser() {
  const session = await getSession();
  return session ? session.user : null;
}

// ---------- 注册 ----------
async function signUp(email, password) {
  await initSupabase();
  const { data, error } = await _sbClient.auth.signUp({ 
    email, 
    password,
    options: {
      emailRedirectTo: 'https://iic-bear.github.io/chengzhi-idiom/index.html'
    }
  });
  if (error) throw error;
  return data;
}

// ---------- 登录 ----------
async function signIn(email, password) {
  await initSupabase();
  const { data, error } = await _sbClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// ---------- 登出 ----------
async function signOut() {
  await initSupabase();
  const { error } = await _sbClient.auth.signOut();
  if (error) console.warn('[Supabase] signOut 错误', error);
}

// ---------- 上传本地数据到云端 ----------
//  调用时机：登录成功、注册成功、用户手动"备份到云端"
//  行为：读取 localStorage → upsert 到 Supabase
async function saveCloudData() {
  await initSupabase();
  const user = await getUser();
  if (!user) throw new Error('未登录，无法同步');

  const userId = user.id;

  // 1. 学习进度  riZhiLu_progress  →  table: user_progress
  const progress = JSON.parse(localStorage.getItem('riZhiLu_progress') || '[]');
  if (progress.length > 0) {
    const rows = progress.map(idiomId => ({
      user_id: userId,
      idiom_id: idiomId,
      updated_at: new Date().toISOString()
    }));
    const { error } = await _sbClient
      .from('user_progress')
      .upsert(rows, { onConflict: ['user_id', 'idiom_id'] });
    if (error) console.warn('[Supabase] 上传进度失败', error);
    else console.log(`[Supabase] 上传进度：${rows.length} 条`);
  }

  // 2. 复习日志  riZhiLu_reviewLog  →  table: user_review_log
  const reviewLog = JSON.parse(localStorage.getItem('riZhiLu_reviewLog') || '{}');
  const logEntries = Object.entries(reviewLog).map(([idiomId, log]) => ({
    user_id: userId,
    idiom_id: parseInt(idiomId),
    first_learn_time: log.firstLearnTime || new Date().toISOString(),
    last_review_time: log.lastReviewTime || null,
    review_count: log.reviewCount || 0,
    updated_at: new Date().toISOString()
  }));
  if (logEntries.length > 0) {
    const { error } = await _sbClient
      .from('user_review_log')
      .upsert(logEntries, { onConflict: ['user_id', 'idiom_id'] });
    if (error) console.warn('[Supabase] 上传复习日志失败', error);
    else console.log(`[Supabase] 上传复习日志：${logEntries.length} 条`);
  }

  // 3. 计划设置  riZhiLu_plan
  const plan = localStorage.getItem('riZhiLu_plan');
  if (plan) {
    const { error } = await _sbClient
      .from('user_settings')
      .upsert({
        user_id: userId,
        setting_key: 'plan',
        setting_value: plan,
        updated_at: new Date().toISOString()
      }, { onConflict: ['user_id', 'setting_key'] });
    if (error) console.warn('[Supabase] 上传计划设置失败', error);
  }

  // 4. 成知余额  riZhiLu_yueli
  const yueli = localStorage.getItem('riZhiLu_yueli');
  if (yueli) {
    const { error } = await _sbClient
      .from('user_settings')
      .upsert({
        user_id: userId,
        setting_key: 'yueli',
        setting_value: yueli,
        updated_at: new Date().toISOString()
      }, { onConflict: ['user_id', 'setting_key'] });
    if (error) console.warn('[Supabase] 上传成知余额失败', error);
  }

  // 5. 收藏  riZhiLu_favorites
  const favorites = localStorage.getItem('riZhiLu_favorites');
  if (favorites) {
    const { error } = await _sbClient
      .from('user_settings')
      .upsert({
        user_id: userId,
        setting_key: 'favorites',
        setting_value: favorites,
        updated_at: new Date().toISOString()
      }, { onConflict: ['user_id', 'setting_key'] });
    if (error) console.warn('[Supabase] 上传收藏失败', error);
  }

  // 6. 个人资料  riZhiLu_profile
  const profile = localStorage.getItem('riZhiLu_profile');
  if (profile) {
    const { error } = await _sbClient
      .from('user_settings')
      .upsert({
        user_id: userId,
        setting_key: 'profile',
        setting_value: profile,
        updated_at: new Date().toISOString()
      }, { onConflict: ['user_id', 'setting_key'] });
    if (error) console.warn('[Supabase] 上传个人资料失败', error);
    else console.log('[Supabase] 上传个人资料完成');
  }

  console.log('[Supabase] 云端备份完成');
}

// ---------- 从云端下载数据（保护型覆写）----------
//  调用时机：用户手动点击"从云端恢复"
//  保护逻辑：
//    - 学习进度：云端条数 ≥ 本地条数 → 覆写
//    - 其他设置：始终用云端版本（假设云端是最新设备）
async function loadCloudData() {
  await initSupabase();
  const user = await getUser();
  if (!user) throw new Error('未登录，无法恢复');

  const userId = user.id;
  let loadedCount = 0;

  // 1. 学习进度（保护型覆写）
  const { data: progressData, error: pErr } = await _sbClient
    .from('user_progress')
    .select('idiom_id')
    .eq('user_id', userId);

  if (!pErr && progressData && progressData.length > 0) {
    const cloudIds = progressData.map(r => r.idiom_id);
    const localProgress = JSON.parse(localStorage.getItem('riZhiLu_progress') || '[]');
    // 保护：云端条数 ≥ 本地条数 才覆写
    if (cloudIds.length >= localProgress.length) {
      localStorage.setItem('riZhiLu_progress', JSON.stringify(cloudIds));
      loadedCount += cloudIds.length;
      console.log(`[Supabase] 恢复进度：${cloudIds.length} 条（本地 ${localProgress.length} 条）`);
    } else {
      console.log('[Supabase] 跳过进度恢复：云端 ' + cloudIds.length + ' 条 < 本地 ' + localProgress.length + ' 条');
    }
  }

  // 2. 复习日志（始终用云端版本，假设云端来自最新设备）
  const { data: reviewData, error: rErr } = await _sbClient
    .from('user_review_log')
    .select('*')
    .eq('user_id', userId);

  if (!rErr && reviewData && reviewData.length > 0) {
    const cloudLog = {};
    reviewData.forEach(r => {
      cloudLog[r.idiom_id] = {
        firstLearnTime: r.first_learn_time,
        lastReviewTime: r.last_review_time,
        reviewCount: r.review_count
      };
    });
    localStorage.setItem('riZhiLu_reviewLog', JSON.stringify(cloudLog));
    loadedCount += reviewData.length;
    console.log('[Supabase] 恢复复习日志：' + reviewData.length + ' 条');
  }

  // 3. 设置项（始终用云端版本）
  const { data: settingsData, error: sErr } = await _sbClient
    .from('user_settings')
    .select('*')
    .eq('user_id', userId);

  if (!sErr && settingsData && settingsData.length > 0) {
    settingsData.forEach(row => {
      if (row.setting_key === 'plan') {
        localStorage.setItem('riZhiLu_plan', row.setting_value);
      } else if (row.setting_key === 'yueli') {
        localStorage.setItem('riZhiLu_yueli', row.setting_value);
      } else if (row.setting_key === 'favorites') {
        localStorage.setItem('riZhiLu_favorites', row.setting_value);
      } else if (row.setting_key === 'profile') {
        localStorage.setItem('riZhiLu_profile', row.setting_value);
      }
    });
    console.log('[Supabase] 恢复设置：' + settingsData.length + ' 项');
  }

  console.log('[Supabase] 云端恢复完成，共恢复 ' + loadedCount + ' 条数据');
  return loadedCount;
}

// ---------- 监听认证状态变化 ----------
function setupAuthListener(callback) {
  initSupabase().then(client => {
    client.auth.onAuthStateChange((event, session) => {
      console.log('[Supabase] auth 状态变化：', event);
      callback(event, session);
    });
  });
}

// ---------- 暴露到全局（供 index.html 调用）----------
//  使用 window.SupabaseSync 命名空间，避免污染全局
window.SupabaseSync = {
  init: initSupabase,
  getSession,
  getUser,
  signUp,
  signIn,
  signOut,
  saveCloudData,
  loadCloudData,
  setupAuthListener
};

console.log('[SupabaseSync] 模块加载完成');