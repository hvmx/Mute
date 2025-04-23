let { type, name, port } = $arguments
type = /^1$|col|组合/i.test(type) ? 'collection' : 'subscription'
let config
try {
  config = JSON.parse($content ?? $files[0])
} catch (e) {
  throw new Error('配置文件不是合法的 JSON')
}
let compatible_tag = 'DIRECT'
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
})

config.inbounds[0].listen_port = parseInt(port)
config.inbounds[1].platform.http_proxy.server_port = parseInt(port)

config.outbounds.push(...proxies)

config.outbounds.map(i => {
  if (['Main'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies))
  }
  // if (['Budget'].includes(i.tag)) {
  //   i.outbounds.push(...getTags(proxies, /0\.\d+倍/))
  // }
  if (['HK'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /香港(?!.*\b(1\.\d+|[2-9]\d*)倍)/))
  }
  if (['JP'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /日本(?!.*\b(1\.\d+|[2-9]\d*)倍)/))
  }
  if (['SG'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /新加坡(?!.*\b(1\.\d+|[2-9]\d*)倍)/))
  }
  if (['US'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /美国(?!.*\b(1\.\d+|[2-9]\d*)倍)/))
  }
  if (['KR'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /韩国(?!.*\b(1\.\d+|[2-9]\d*)倍)/))
  }
  if (['TW'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /台湾(?!.*\b(1\.\d+|[2-9]\d*)倍)/))
  }
})

config.outbounds.forEach(outbound => {
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    outbound.outbounds.push(compatible_tag);
  }
});

$content = JSON.stringify(config, null, 2)

function getTags(proxies, regex) {
  return (regex ? proxies.filter(p => regex.test(p.tag)) : proxies).map(p => p.tag)
}