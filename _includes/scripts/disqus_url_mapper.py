#map the disqus url to its original urls
fname = 'drustz-2020-11-24T00_12_08.588286-links.csv'
with open(fname, 'r') as f:
    lines = f.readlines()

maplines = []
for i in range(len(lines)):
    mapto = lines[i].strip()
    #to https
    if mapto.startswith('http://'):
        mapto = mapto.replace('http://', 'https://')
    #remove extra params
    if '.html' in mapto:
        mapto = mapto[:mapto.rfind('.html')] + '/'
    elif mapto[-1] != '/':
        mapto = mapto[:mapto.rfind('/')+1]
    #github to drustz
    mapto = mapto.replace('drustz.github.io', 'drustz.com')
    mapto = mapto.replace('index.php', 'posts')
    if mapto != lines[i].strip():
        maplines.append(lines[i].strip() + ',' + mapto + '\n')

with open('mapping.csv', 'w') as f:
    for line in maplines:
        f.write(line)
