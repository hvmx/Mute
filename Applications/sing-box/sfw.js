let config
try {
  config = JSON.parse($content ?? $files[0])
} catch (e) {
  throw new Error('配置文件不是合法的 JSON')
}
const DIRECT_TAG = 'direct'

const SUBSCRIPTIONS = ['kt', 'lxy']

const REGIONS = [
  ['HK', /香港|Hong Kong(?!.*\b(1\.\d+|[2-9]\d*)倍)/],
  ['JP', /日本|Japan(?!.*\b(1\.\d+|[2-9]\d*)倍)/],
  ['KR', /韩国|Korea(?!.*\b(1\.\d+|[2-9]\d*)倍)/],
  ['SG', /新加坡|Singapore(?!.*\b(1\.\d+|[2-9]\d*)倍)/],
  ['US', /美国|America|United States(?!.*\b(1\.\d+|[2-9]\d*)倍)/]
]

const GROUPS = {
  Proxy: ['*', DIRECT_TAG],
  AI: ['*'],
  Games: ['*', DIRECT_TAG],
  GitHub: ['*', DIRECT_TAG],
  Google: ['*'],
  Spotify: ['*', DIRECT_TAG],
  // TikTok: ['JP'],
}

const allProxies = []
const regionOutbounds = []

// 逐个处理订阅，保持原始订阅顺序。
for (const [index, name] of SUBSCRIPTIONS.entries()) {
  const proxies = await produceArtifact({
    name,
    type: 'subscription',
    platform: 'sing-box',
    produceType: 'internal',
  })

  // 为每个地区预先创建节点列表，保持 REGIONS 定义顺序。
  const regionTags = new Map(
    REGIONS.map(([region]) => [region, []])
  )

  // 单次遍历节点，同时清理字段并完成地区分类。
  for (const proxy of proxies) {
    // 移除目标 sing-box 版本不支持的字段。
    // 原地修改对象，避免复制整个代理配置。
    if (proxy.tls) {
      delete proxy.tls.certificate_sha256
    }

    // 一个节点可以匹配多个地区规则，保持原有匹配行为。
    for (const [region, regex] of REGIONS) {
      if (regex.test(proxy.tag)) {
        regionTags.get(region).push(proxy.tag)
      }
    }
  }

  // 保留所有代理节点及其原始顺序。
  allProxies.push(...proxies)

  // 按地区定义顺序生成订阅对应的 urltest 节点。
  for (const [region] of REGIONS) {
    const tags = regionTags.get(region)

    if (tags.length) {
      regionOutbounds.push({
        tag: `${region}${String(index + 1).padStart(2, '0')}`,
        type: 'urltest',
        outbounds: tags,
      })
    }
  }
}

// 按标签排序，例如 HK01、HK02、JP01、JP02。
regionOutbounds.sort((a, b) => a.tag.localeCompare(b.tag))

// 提取所有地区出口标签，供后续分组复用。
const regionTags = getTags(regionOutbounds)

// 将订阅节点和地区出口追加到现有配置，不覆盖原有节点。
config.outbounds.push(...allProxies, ...regionOutbounds)

// 创建或更新策略组，保留已有组的出口并去重。
for (const [tag, group] of Object.entries(GROUPS)) {
  let outbound = config.outbounds.find(item => item.tag === tag)

  if (!outbound) {
    outbound = {
      tag,
      type: 'selector',
      outbounds: [],
    }

    config.outbounds.push(outbound)
  }

  // 新生成的出口排在前面，已有出口排在后面。
  // Set 保留首次出现顺序，同时去除重复标签。
  outbound.outbounds = [
    ...new Set([
      ...getGroupTags(group),
      ...outbound.outbounds,
    ]),
  ]

  // 没有任何可用出口时，默认回退到 Direct。
  if (!outbound.outbounds.length) {
    outbound.outbounds.push(DIRECT_TAG)
  }
}

// 输出格式化后的 JSON 配置。
$content = JSON.stringify(config, null, 2)

// 提取节点标签，保持传入数组的顺序。
function getTags(items) {
  return items.map(({ tag }) => tag)
}

// 根据分组规则解析需要加入的出口标签。
function getGroupTags(group) {
  return group.flatMap(item => {
    // '*' 匹配全部地区出口。
    if (item === '*') return regionTags

    // 显式指定 Direct 时加入直连出口。
    if (item === DIRECT_TAG) return [DIRECT_TAG]

    // 地区代码匹配对应前缀，例如 JP 匹配 JP01、JP02。
    return regionTags.filter(tag => tag.startsWith(item))
  })
}