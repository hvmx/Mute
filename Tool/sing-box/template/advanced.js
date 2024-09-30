const { type, name, port } = $arguments

let compatible_tag = 'REJECT'
let config = JSON.parse($files[0])
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
})

config.inbounds[0].platform.http_proxy.server_port = parseInt(port)

config.inbounds[1].listen_port = parseInt(port)

config.outbounds.push(...proxies)

config.outbounds.map(i => {
  if (['Automatic', 'Manual'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies))
  }
  if (['HK'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /港|hk|hongkong|kong kong|🇭🇰/i))
  }
  if (['JP'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /日本|jp|japan|🇯🇵/i))
  }
  if (['SG'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /^(?!.*(?:us)).*(新|sg|singapore|🇸🇬)/i))
  }
  if (['US'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /美|us|unitedstates|united states|🇺🇸/i))
  }
  if (['KR'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /韩/i))
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