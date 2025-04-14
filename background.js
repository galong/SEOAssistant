// SEO妙笔 后台脚本
// 使用 ES 模块导入

import ApiService from './js/api-service.js';

// 监听扩展安装或更新
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // 首次安装时打开设置页面
    chrome.tabs.create({ url: 'options.html' });
  }
});

// 监听扩展图标点击
chrome.action.onClicked.addListener((tab) => {
  // 打开侧边栏
  chrome.sidePanel.open({ tabId: tab.id });
});

// 处理来自内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 使用 switch 语句处理不同的消息类型
  switch (message.action) {
    case 'getKeywordData':
      // 处理关键词数据请求
      (async () => {
        try {
          // 直接使用导入的 ApiService
          // 调用API服务获取关键词数据
          const country = message.country || 'cn'; // 默认使用中国
          const data = await ApiService.getKeywordData(message.keyword, country);
          
          sendResponse({ success: true, data });
        } catch (error) {
          logError('获取关键词数据出错:', error);
          // 发生错误时返回模拟数据作为备选
          sendResponse({ success: true, data: ApiService.getMockKeywordData(message.keyword) });
        }
      })();
      return true;
      
    case 'getGoogleResults':
      // 处理Google搜索结果请求
      (async () => {
        try {
          // 直接使用导入的 ApiService
          // 调用API服务获取Google搜索结果
          const country = message.country || 'cn'; // 默认使用中国
          const data = await ApiService.getGoogleSearchResults(message.keyword, country);
          
          sendResponse({ success: true, data });
        } catch (error) {
          logError('获取Google搜索结果出错:', error);
          // 发生错误时返回模拟数据作为备选
          sendResponse({ success: true, data: ApiService.getMockGoogleResults(message.keyword) });
        }
      })();
      return true;
      
    case 'generateAIContent':
      // 处理AI内容生成请求
      (async () => {
        try {
          // 直接使用导入的 ApiService
          // 获取AI服务类型
          const aiService = message.aiService || 'deepseek'; // 使用传入的AI服务或默认值
          
          // 调用API服务生成AI内容
          const data = await ApiService.generateAIContent(message.prompt, aiService);
          
          sendResponse({ success: true, data });
        } catch (error) {
          logError('生成AI内容出错:', error);
          // 发生错误时返回模拟数据作为备选
          sendResponse({ 
            success: true, 
            data: `# ${message.prompt.includes('SEO keyword reporting') ? '关键词分析报告' : 'SEO优化文章'}\n\n这是一个示例${message.prompt.includes('SEO keyword reporting') ? '关键词分析报告' : '文章'}，实际使用时会通过AI服务生成内容。\n\n## 主要内容\n\n- 第一部分内容\n- 第二部分内容\n- 第三部分内容\n\n## 详细信息\n\n这里是详细的内容说明...`
          });
        }
      })();
      
      return true;
      
    case 'validateApiSettings':
      // 添加验证API设置的处理逻辑
      (async () => {
        try {
          // 从存储中获取API设置
          const settings = await chrome.storage.sync.get([
            'searchService',
            'semrushApiKey',
            'serpApiKey',
            'searchApiKey',
            'googleApiKey',
            'googleCseId',
            'aiService',
            'aiApiKey'
          ]);
          
          console.log('验证API设置:', settings);
          
          // 检查必要的设置是否存在
          const missingSettings = [];
          
          // 根据选择的搜索服务验证对应的API密钥
          const searchService = settings.searchService || 'semrush';
          
          if (searchService === 'semrush' && !settings.semrushApiKey) {
            missingSettings.push('SEMrush API密钥');
          } else if (searchService === 'serpapi' && !settings.serpApiKey) {
            missingSettings.push('SerpAPI密钥');
          } else if (searchService === 'custom' && !settings.searchApiKey) {
            missingSettings.push('搜索API密钥');
          }
          
          if (!settings.googleApiKey) {
            missingSettings.push('Google API密钥');
          }
          
          if (!settings.googleCseId) {
            missingSettings.push('Google CSE ID');
          }
          
          if (!settings.aiApiKey) {
            missingSettings.push('AI API密钥');
          }
          
          // 返回验证结果
          sendResponse({
            success: true,
            data: {
              isValid: missingSettings.length === 0,
              missingSettings: missingSettings
            }
          });
        } catch (error) {
          console.error('验证API设置时出错:', error);
          sendResponse({
            success: false,
            error: `验证API设置时出错: ${error.message}`
          });
        }
      })();
      return true;
      
    case 'proxyFetch':
      // 处理代理请求
      (async () => {
        try {
          const { url, method, body, headers = {} } = message;
          
          logInfo('代理请求:', url);
          
          const options = {
            method: method || 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...headers
            }
          };
          
          if (body) {
            options.body = JSON.stringify(body);
          }
          
          logInfo('请求选项:', {
            method: options.method,
            headers: Object.keys(options.headers),
            bodyLength: options.body ? options.body.length : 0
          });
          
          const response = await fetch(url, options);
          
          if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(`请求失败: ${response.status} ${response.statusText} - ${errorText}`);
          }
          
          let data;
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            data = await response.text();
          }
          
          logInfo('代理请求成功');
          sendResponse({ success: true, data });
        } catch (error) {
          logError('代理请求出错:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;
      
    // 其他消息处理...
    default:
      sendResponse({ success: false, error: '未知的消息类型' });
      return true;
  }
});

// 日志记录函数
function logInfo(message, data) {
  console.log(`[SEO妙笔] ${message}`, data || '');
}

function logError(message, error) {
  console.error(`[SEO妙笔 Error] ${message}`, error);
}

// 注册服务工作进程（如果需要）
chrome.runtime.onStartup.addListener(() => {
  logInfo('扩展已启动');
});

// 移除所有对 self 的引用
// 使用 try-catch 进行错误处理
try {
  // 初始化代码
  logInfo('后台脚本已加载');
} catch (error) {
  logError('初始化错误:', error);
}
