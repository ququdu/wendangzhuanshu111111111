#!/usr/bin/env node

/**
 * AI API 连通性测试脚本
 * 自动检测并测试项目中配置的 AI 服务提供商
 */

const { createProviderManager } = require('./packages/providers/dist/index.js')

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`
}

/**
 * 检查环境变量中的 API 配置
 */
function detectApiConfigs() {
  const configs = []
  
  // Anthropic Claude
  if (process.env.ANTHROPIC_API_KEY) {
    configs.push({
      id: 'anthropic',
      type: 'anthropic',
      name: 'Anthropic Claude',
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseUrl: process.env.ANTHROPIC_BASE_URL,
      defaultModel: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      enabled: true
    })
  }
  
  // OpenAI
  if (process.env.OPENAI_API_KEY) {
    configs.push({
      id: 'openai',
      type: 'openai',
      name: 'OpenAI GPT',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL,
      defaultModel: process.env.OPENAI_MODEL || 'gpt-4o',
      enabled: true
    })
  }
  
  // OpenAI Compatible (如 DeepSeek, 通义千问等)
  if (process.env.OPENAI_COMPATIBLE_API_KEY) {
    configs.push({
      id: 'openai-compatible',
      type: 'openai-compatible',
      name: process.env.OPENAI_COMPATIBLE_NAME || 'OpenAI Compatible',
      apiKey: process.env.OPENAI_COMPATIBLE_API_KEY,
      baseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL,
      defaultModel: process.env.OPENAI_COMPATIBLE_MODEL || 'deepseek-chat',
      enabled: true
    })
  }
  
  // DeepL
  if (process.env.DEEPL_API_KEY) {
    configs.push({
      id: 'deepl',
      type: 'deepl',
      name: 'DeepL Translator',
      apiKey: process.env.DEEPL_API_KEY,
      baseUrl: process.env.DEEPL_FREE ? 'https://api-free.deepl.com' : undefined,
      enabled: true
    })
  }
  
  return configs
}

/**
 * 测试单个 Provider 的连通性
 */
async function testProvider(providerManager, providerId) {
  const startTime = Date.now()
  
  try {
    const provider = providerManager.getProvider(providerId)
    if (!provider) {
      return {
        success: false,
        error: 'Provider 实例获取失败',
        responseTime: Date.now() - startTime
      }
    }
    
    // 测试连通性
    const isAvailable = await Promise.race([
      provider.isAvailable(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('连接超时')), 10000)
      )
    ])
    
    const responseTime = Date.now() - startTime
    
    if (isAvailable) {
      // 尝试获取模型列表（如果支持）
      let models = []
      try {
        models = await provider.getModels()
      } catch (e) {
        // 忽略获取模型列表的错误
      }
      
      return {
        success: true,
        responseTime,
        models: models.slice(0, 5), // 只显示前5个模型
        modelCount: models.length
      }
    } else {
      return {
        success: false,
        error: 'Provider 不可用',
        responseTime
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '测试失败',
      responseTime: Date.now() - startTime
    }
  }
}

/**
 * 主测试函数
 */
async function main() {
  console.log(colorize('\n🔍 AI API 连通性测试', 'cyan'))
  console.log(colorize('=' .repeat(50), 'cyan'))
  
  // 检测 API 配置
  const configs = detectApiConfigs()
  
  if (configs.length === 0) {
    console.log(colorize('❌ 未检测到任何 AI API 配置', 'yellow'))
    console.log('\n请设置以下环境变量之一：')
    console.log('  • ANTHROPIC_API_KEY')
    console.log('  • OPENAI_API_KEY')
    console.log('  • OPENAI_COMPATIBLE_API_KEY')
    console.log('  • DEEPL_API_KEY')
    return
  }
  
  console.log(colorize(`\n✅ 检测到 ${configs.length} 个 API 配置`, 'green'))
  
  // 创建 Provider 管理器
  let providerManager
  try {
    providerManager = createProviderManager({
      providers: configs,
      defaultProvider: configs[0].id,
      fallbackChain: configs.slice(1).map(c => c.id),
      retryAttempts: 1,
      timeout: 10000
    })
  } catch (error) {
    console.log(colorize(`❌ Provider 管理器创建失败: ${error.message}`, 'red'))
    return
  }
  
  // 测试每个 Provider
  console.log(colorize('\n🧪 开始连通性测试...', 'magenta'))
  console.log(colorize('-'.repeat(50), 'magenta'))
  
  const results = []
  
  for (const config of configs) {
    console.log(`\n${colorize('📡', 'blue')} 测试 ${colorize(config.name, 'bright')} (${config.type})`)
    
    if (config.baseUrl) {
      console.log(`   URL: ${config.baseUrl}`)
    }
    
    if (config.defaultModel) {
      console.log(`   模型: ${config.defaultModel}`)
    }
    
    // 显示测试中状态
    process.stdout.write('   状态: ')
    
    const result = await testProvider(providerManager, config.id)
    results.push({ ...config, ...result })
    
    if (result.success) {
      console.log(colorize('✅ 可用', 'green'))
      console.log(`   响应时间: ${result.responseTime}ms`)
      
      if (result.modelCount > 0) {
        console.log(`   可用模型: ${result.modelCount} 个`)
        if (result.models.length > 0) {
          console.log(`   示例模型: ${result.models.join(', ')}`)
        }
      }
    } else {
      console.log(colorize('❌ 不可用', 'red'))
      console.log(`   错误: ${result.error}`)
      console.log(`   响应时间: ${result.responseTime}ms`)
    }
  }
  
  // 输出总结
  console.log(colorize('\n📊 测试总结', 'cyan'))
  console.log(colorize('-'.repeat(50), 'cyan'))
  
  const availableCount = results.filter(r => r.success).length
  const totalCount = results.length
  
  console.log(`\n总配置数: ${totalCount}`)
  console.log(`可用数量: ${colorize(availableCount, availableCount > 0 ? 'green' : 'red')}`)
  console.log(`不可用数量: ${colorize(totalCount - availableCount, 'red')}`)
  
  if (availableCount > 0) {
    console.log(colorize('\n✅ 系统可以正常使用 AI 功能', 'green'))
    
    const availableProviders = results.filter(r => r.success)
    console.log('\n可用的 Provider:')
    availableProviders.forEach(provider => {
      console.log(`  • ${provider.name} (${provider.type})`)
    })
  } else {
    console.log(colorize('\n❌ 没有可用的 AI Provider，请检查配置', 'red'))
  }
  
  console.log(colorize('\n🎉 测试完成', 'cyan'))
}

// 运行测试
if (require.main === module) {
  main().catch(error => {
    console.error(colorize(`\n💥 测试过程中发生错误: ${error.message}`, 'red'))
    process.exit(1)
  })
}

module.exports = { detectApiConfigs, testProvider, main }