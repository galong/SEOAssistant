// SEO Assistant 设置页面脚本

document.addEventListener('DOMContentLoaded', () => {
  // 获取DOM元素
  const apiSettingsForm = document.getElementById('api-settings-form');
  const testConnectionBtn = document.getElementById('test-connection');
  const testResultAlert = document.getElementById('test-result');
  
  // 加载保存的设置
  loadSavedSettings();
  
  // 监听搜索服务变化，动态更新标签
  document.getElementById('search-service').addEventListener('change', updateSearchApiLabel);
  
  // 表单提交处理
  apiSettingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettings();
  });
  
  // 测试连接按钮
  testConnectionBtn.addEventListener('click', async () => {
    await testConnections();
  });
  
  // 更新搜索API标签
  function updateSearchApiLabel() {
    const searchService = document.getElementById('search-service').value;
    const searchApiLabel = document.getElementById('search-api-label');
    const searchApiHelp = document.getElementById('search-api-help');
    
    switch(searchService) {
      case 'semrush':
        searchApiLabel.textContent = 'SEMrush API 密钥';
        searchApiHelp.textContent = '请输入SEMrush API密钥用于关键词分析';
        break;
      case 'serpapi':
        searchApiLabel.textContent = 'SerpAPI 密钥';
        searchApiHelp.textContent = '请输入SerpAPI密钥用于搜索结果分析';
        break;
      default:
        searchApiLabel.textContent = '搜索 API 密钥';
        searchApiHelp.textContent = '请输入所选搜索服务的 API 密钥';
    }
  }
  
  // 加载保存的设置
  async function loadSavedSettings() {
    const settings = await chrome.storage.sync.get([
      'aiService',
      'aiApiKey',
      'searchService',
      'searchApiKey',
      'semrushApiKey', // 添加SEMrush专用键
      'serpApiKey',     // 添加SerpAPI专用键
      'googleApiKey',
      'googleCseId'
    ]);
    
    console.log('加载的设置:', settings);
    
    // 设置AI服务
    if (settings.aiService) {
      document.getElementById('ai-service').value = settings.aiService;
    }
    if (settings.aiApiKey) {
      document.getElementById('ai-api-key').value = settings.aiApiKey;
    }
    
    // 设置搜索服务
    if (settings.searchService) {
      document.getElementById('search-service').value = settings.searchService;
    }
    
    // 根据搜索服务设置对应的API密钥
    const searchService = settings.searchService || 'semrush';
    if (searchService === 'semrush' && settings.semrushApiKey) {
      document.getElementById('search-api-key').value = settings.semrushApiKey;
    } else if (searchService === 'serpapi' && settings.serpApiKey) {
      document.getElementById('search-api-key').value = settings.serpApiKey;
    } else if (settings.searchApiKey) {
      // 兼容旧版本
      document.getElementById('search-api-key').value = settings.searchApiKey;
    }
    
    // 设置Google API
    if (settings.googleApiKey) {
      document.getElementById('google-api-key').value = settings.googleApiKey;
    }
    if (settings.googleCseId) {
      document.getElementById('google-cse-id').value = settings.googleCseId;
    }
    
    // 更新搜索API标签
    updateSearchApiLabel();
  }
  
  // 保存设置
  async function saveSettings() {
    const aiService = document.getElementById('ai-service').value;
    const aiApiKey = document.getElementById('ai-api-key').value;
    const searchService = document.getElementById('search-service').value;
    const searchApiKey = document.getElementById('search-api-key').value;
    const googleApiKey = document.getElementById('google-api-key').value;
    const googleCseId = document.getElementById('google-cse-id').value;
    
    // 创建基本设置对象
    const settings = {
      aiService,
      aiApiKey,
      searchService,
      googleApiKey,
      googleCseId
    };
    
    // 根据搜索服务类型保存对应的API密钥
    if (searchService === 'semrush') {
      settings.semrushApiKey = searchApiKey;
    } else if (searchService === 'serpapi') {
      settings.serpApiKey = searchApiKey;
    }
    
    // 为了兼容性，也保存通用的searchApiKey
    settings.searchApiKey = searchApiKey;
    
    console.log('保存的设置:', settings);
    
    await chrome.storage.sync.set(settings);
    
    showTestResult('设置已保存', 'success');
  }
  
  // 测试连接
  async function testConnections() {
    const aiService = document.getElementById('ai-service').value;
    const aiApiKey = document.getElementById('ai-api-key').value;
    const searchService = document.getElementById('search-service').value;
    const searchApiKey = document.getElementById('search-api-key').value;
    const googleApiKey = document.getElementById('google-api-key').value;
    const googleCseId = document.getElementById('google-cse-id').value;
    
    showTestResult('正在测试连接...', 'info');
    
    let results = [];
    
    // 测试AI API
    if (aiApiKey) {
      try {
        // 实际测试AI API连接
        const testResult = await testAiApi(aiService, aiApiKey);
        if (testResult.success) {
          results.push(`✅ ${aiService} API 连接成功`);
        } else {
          results.push(`❌ ${aiService} API 连接失败: ${testResult.error}`);
        }
      } catch (error) {
        results.push(`❌ ${aiService} API 连接失败: ${error.message}`);
      }
    } else {
      results.push('⚠️ 未提供AI API密钥');
    }
    
    // 测试搜索API
    if (searchApiKey) {
      try {
        // 实际测试搜索API连接
        const testResult = await testSearchApi(searchService, searchApiKey);
        if (testResult.success) {
          results.push(`✅ ${searchService} API 连接成功`);
        } else {
          results.push(`❌ ${searchService} API 连接失败: ${testResult.error}`);
        }
      } catch (error) {
        results.push(`❌ ${searchService} API 连接失败: ${error.message}`);
      }
    } else {
      results.push(`⚠️ 未提供${searchService === 'semrush' ? 'SEMrush' : searchService === 'serpapi' ? 'SerpAPI' : '搜索'}API密钥`);
    }
    
    // 测试Google API
    if (googleApiKey && googleCseId) {
      try {
        // 实际测试Google API连接
        const testResult = await testGoogleApi(googleApiKey, googleCseId);
        if (testResult.success) {
          results.push('✅ Google API 连接成功');
        } else {
          results.push(`❌ Google API 连接失败: ${testResult.error}`);
        }
      } catch (error) {
        results.push(`❌ Google API 连接失败: ${error.message}`);
      }
    } else {
      results.push('⚠️ 未提供完整的Google API信息');
    }
    
    // 显示测试结果
    showTestResult(results.join('<br>'), 'info');
    
    // 保存设置
    saveSettings();
  }
  
  // 测试AI API
  async function testAiApi(service, apiKey) {
    // 这里应该实际测试AI API连接
    // 由于是示例，我们模拟成功
    return { success: true };
  }
  
  // 测试搜索API
  async function testSearchApi(service, apiKey) {
    // 这里应该实际测试搜索API连接
    // 由于是示例，我们模拟成功
    return { success: true };
  }
  
  // 测试Google API
  async function testGoogleApi(apiKey, cseId) {
    // 这里应该实际测试Google API连接
    // 由于是示例，我们模拟成功
    return { success: true };
  }
  
  // 显示测试结果
  function showTestResult(message, type) {
    testResultAlert.innerHTML = message;
    testResultAlert.classList.remove('d-none', 'alert-info', 'alert-success', 'alert-danger');
    
    switch (type) {
      case 'success':
        testResultAlert.classList.add('alert-success');
        break;
      case 'error':
        testResultAlert.classList.add('alert-danger');
        break;
      default:
        testResultAlert.classList.add('alert-info');
    }
    
    // 5秒后自动隐藏成功消息
    if (type === 'success') {
      setTimeout(() => {
        testResultAlert.classList.add('d-none');
      }, 5000);
    }
  }
});