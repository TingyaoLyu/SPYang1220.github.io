---
layout: post
date: 2015-11-17 
title: 一步一步了解FAT32文件系统
category: [posts]
comments: true
tags: [programming, operating system]
---

<p>操作系统又布置了新的作业，拖了两周，今天终于把我的部分做完了。这次的内容也很有用，文件系统，特别是FAT32的实现。</p>
<p>我们的作业则是要做一个文件恢复的工具。我的部分是读取文件夹以及列出文件夹下相关信息，比较水，但对了解文件系统很有帮助。首先依然是目录：</p>

<ul><a href="#1">1.FAT文件系统知识概览</a></ul>
<ul><a href="#2">2.如何直接与文件系统交互</a></ul>
<ul><a href="#3">3.读取Boot Sector</a></ul>
<ul><a href="#4">4.读取Root Directory</a></ul>
<ul><a href="#5">5.FAT（File Allocate Table）</a></ul>
<ul><a href="#6">6.结合起来</a></ul>
<ul><a href="#7">7.文件删除与恢复</a></ul>

<hr>

<h3><a id=1>1.FAT文件系统知识概览</a></h3>

<p>文章之初，我们先了解一下，FAT文件系统的知识。首先，什么是文件系统？简而言之，就是存储以及管理文件的一套机制，它涉及到了文件的储存方式、添加删除修改文件等操作的实现以及各种相关操作。大家熟知的文件系统有FAT,NTFS,HFS(MAC系统),ext2/3/4(LINUX)等。我们这里主要关注FAT32系统。</p>
<li>什么是文件</li>
<p>文件，其实就是数据。数据在计算机内以0/1表示，最基本的单位是bit（比特）。8bit = 1Byte，1024Byte = 1KByte，1024KB = 1MB，如此如此。文件内容也是若干01串的组合。在读写文件的时候，我们会调用kernel中的函数read()/write()，它们接受文件的描述符，然后读/写指定长度的数据。所有数据也都是0/1的形式，只不过我们在运用这些函数的时候，这些数据被转成了更加高级的表示，例如char，int或者其他类型。这里我们不做详细描述，如果你对数据的表示感兴趣，建议大家看一看清华大学（。。。）的公开课：汇编语言中的"<a href="http://www.xuetangx.com/courses/TsinghuaX/20240103X/2015_T2/">基础知识-整数的机器表示</a>",有兴趣也可以都看一下，十分有用。</p>
<li>磁盘是什么</li>
<p>现在的硬盘容量已经达到了TB的级别，它们的物理实现与原理又是怎样的呢？我就简单地带过一下，具体细节可以去<a href="http://www.explainthatstuff.com/harddrive.html">How a hard disk work?</a>，里面很简洁地说明了他的工作原理。</p>
<p>磁盘最重要的就是扇面，扇面上面有一圈圈的磁道，这些磁道中储存着信息。如何进行读写呢？物理层面上，是通过用磁头改变磁道中每个存储单元的极性来实现的。</p>
<p>磁盘中的物理储存单位叫做sector(扇区)，而文件系统中一个储存单位叫做block(FAT系统叫cluster)，每一个cluster对应1到多个扇区。维基上有更详细的解释<a href="https://en.wikipedia.org/wiki/Disk_sector">Disk Sector</a></p>

<li>FAT32的文件存储</li>
<p>平常操作文件的时候，例如你打开一个doc文件，增加一些内容然后保存，或者删除某个文件到回收站，它们的内部操作是如何实现的呢？不同的文件系统有不同的实现方式。但所有的操作都离不开存储作为基础，问题来了：如何设计一个文件系统，让它既能高效读写文件，又能快速对文件定位？</p>
<p>我们来看看最原始的想法：直接连续添加，也就是把文件一个挨着一个地加到储存空间（硬盘）中去。但是，这样实现，既不利于查找，也不利于删除、添加与修改。想一想，如果把一些文件删除，就会产生缺口，再次添加文件的时候，单独的缺口可能不足以容纳新的文件，从而产生浪费。而且只要查找某个文件，就需要遍历所有的文件结构，这个是要花相当长的时间。</p>
<p>我们来看一看FAT32的实现方式：它将储存空间分成了一个个小块(cluster),存储文件的时候，会把文件切分成对应长度的小块，然后填充到硬盘中去：</p>
<img src="https://i-technet.sec.s-msft.com/dynimg/IC212683.gif" alt="cluster" height="" width="" style="display: block; margin-left: auto; margin-right: auto">
<p>这样一来，我们就不用担心文件太大以至于不能放进缺口中，因为我们可以把一部分小块放在一个缺口，把另一部分小块放在另外的地方，这样很高效地利用了磁盘的空间。</p>
<p>第二个概念，FAT32采用了链表的数据结构。也就是说，磁盘中的每一个cluter都是链表中的一个节点，它们记录着下一个cluster的位置（next pointer）。什么叫下一个cluster？如果一个文件被放在了储存空间中，如果他所占用了超过一个cluster，那么我们就需要把这些cluster连接起来。FAT32中，只记录了每一个文件开始的cluster，所以我们需要用链表来完成访问整个文件的操作。</p>
<p>下图中，三种颜色表示三个不同的文件，注意，橘色的文件被分到了两个连续的储存区域：</p>
<img src="http://s13.postimg.org/w1dyqynqt/cluster2.png" alt="cluster" height="" width="" style="display: block; margin-left: auto; margin-right: auto">
<p>这是他们对应的链表表示：</p>
<img src="http://s27.postimg.org/t5cr50fz5/cluster1.png" alt="cluster" height="" width="" style="display: block; margin-left: auto; margin-right: auto">
<p>用来存储这个链表信息的表格叫做FAT(FILE ALLOCATE TABLE),真正存放数据的地方与FAT是相互分离的。FAT的作用就是方便查找。</p>
<p>接下来我们看看，删除的操作。这会引出另一个专有结构：FILE ENTRY</p>
<p>首先你来回想一下，删除文件和写入一个新的文件（比如复制粘贴），哪个更快些？删除。几乎是互逆过程，为何时间不同？实际上，在你删除文件的时候，文件系统并没有真正地把数据从磁盘上抹去（这也是为什么我们有希望恢复删除文件的原因），而只是修改了它的FILE ENTRY信息。</p>
<p>何谓FILE ENTRY?简单些讲，就是记录文件属性的一个小结构。它们被统一存储在ROOT DIRECTORY中。我们先看一下FAT32的磁盘整体面貌</p>
<img src="https://dev64.files.wordpress.com/2012/03/fat32_structure_1.png" alt="cluster" height="" width="" style="display: block; margin-left: auto; margin-right: auto">
<p>我们先忽略最前面的几个sector，从FAT看起。一个FAT系统有若干个FAT结构（因为磁盘大小不同，所需要的链表节点数也不同），紧挨FAT区域的是ROOT DIRECTORY,它是整个磁盘的目录结构，而这之中存储的就是我们说的FILE ENTRY,也就是每个文件的属性。ROOT DIRECTORY后，才是真正地DATA FIELD，用来存储真正地文件内容。</p>
<p>在我们查看某个文件信息而非打开它时，我们并不需要直接访问文件的数据。文件系统会在ROOT DIRECTORY找到相应的FILE ENTRY，然后把相关信息显示出来。这包括：文件名，创建、修改时间，文件大小，文件的第一个cluster的位置，只读/隐藏等等。请注意，文件夹在文件系统中也表示成一个文件，也有相应的FILE ENTRY，只是他们储存的是一批文件而已(FILE ENTRY中会有相应的标志显示是否是文件夹)。</p>
<p>回到我们删除文件的话题，当一个文件被删除的时候，系统会找到相应的FILE ENTRY，把文件名第一个字符改为0xE5——完毕。就是这么简单，只是把文件属性修改，一点内部数据都没有改动。这时候如果我们再添加一个文件进去，由于系统会通过查找ROOT DIRECTORY来确定可用的空间，因此如果发现一些FILE ENTRY文件名是未分配或者已经删除的标志，那么对应的cluster就会被占用。但是在被覆盖之前，这些删除的文件依然存在在你的硬盘里（只是你丢失了如何获取他们信息的渠道）。这就是为什么删除要更快些。</p>

<h3><a id=2>2.如何直接与文件系统交互</a></h3>
<p>讲了这么多预备知识，不知道你有没有信心在往下看了。。。（文件系统应该是操作系统中最复杂的部分了）哈哈，不过没关系，如果理解了FAT32的基本原理（你可以去谷歌多多搜索），接下来的内容一定会让你收获颇丰。</p>
<p>上面提到，我们平时与文件交互的时候，都会触发kernel中的read/write操作。但是我们不会直接与ROOT DIRECTORY、FILE ENTRY等产生接触，而是把文件路径作为参数，调用函数，然后获取包装好的data。那么如何自己实现查找文件并且交互的过程呢？让我来教你~</p>
<br><ul>
<p><strong>首先，我们需要完成第一个任务：如何获得一个FAT32的磁盘</strong></p>
<p>我的作业是在32bit linux虚拟机环境下完成的，你可以也配置一个相同的环境。</p>
<p>在linux系统中，所有储存设备都是以文件方式表示的，内存也不例外。用</p>
<!-- HTML generated using hilite.me -->
<div style="background: #ffffff; overflow:auto;width:auto;border:solid gray;border-width:.1em .1em .1em .8em;padding:.2em .6em;"><pre style="margin: 0; line-height: 125%">ls /dev/ram*
</pre></div>
<p>可以看到所有的内存设备。我们可以把一小块内存变成一个FAT32的存储系统（当然，重启之后就消失了）,利用</p>
<!-- HTML generated using hilite.me -->
<div style="background: #ffffff; overflow:auto;width:auto;border:solid gray;border-width:.1em .1em .1em .8em;padding:.2em .6em;"><pre style="margin: 0; line-height: 125%">$ sudo dd <span style="color: #000080; font-weight: bold">if</span>=/dev/zero of=/dev/ram1 bs=64M count=1
</pre></div>
来把RAM1清零（这是预备操作，dd是深度拷贝），然后用
<!-- HTML generated using hilite.me -->
<div style="background: #ffffff; overflow:auto;width:auto;border:solid gray;border-width:.1em .1em .1em .8em;padding:.2em .6em;"><pre style="margin: 0; line-height: 125%">$ sudo mkfs.vfat -F 32 /dev/ram1
</pre></div>
把RAM1变为FAT32格式的“硬盘”。这时我们便获得了一块FAT32存储设备。
<p>用dosfsck命令可以查看FAT32设备的相关信息：</p>
<!-- HTML generated using hilite.me -->
<div style="background: #ffffff; overflow:auto;width:auto;border:solid gray;border-width:.1em .1em .1em .8em;padding:.2em .6em;"><pre style="margin: 0; line-height: 125%">$ sudo dosfsck -v /dev/ram1
dosfsck 3.0.12 (29 Oct 2011)
dosfsck 3.0.12 , 29 Oct 2011 , FAT32 , LFN
Checking we can access the last sector of the filesystem
Boot sector contents :
System ID <span style="color: #0000FF">&quot; mkdosfs &quot;</span>
Media byte 0 xf8 ( hard disk )
512 bytes per logical sector
512 bytes per cluster
32 reserved sectors
First FAT starts at byte 16384 ( sector 32)
2 FATs , 32 bit entries
516608 bytes per FAT (= 1009 sectors )
Root directory start at cluster 2 ( arbitrary size )
Data area starts at byte 1049600 ( sector 2050)
129022 data clusters (66059264 bytes )
63 sectors / track , 255 heads
0 hidden sectors
131072 sectors total
Checking <span style="color: #000080; font-weight: bold">for </span>unused clusters .
Checking free cluster summary .
/dev/ram1 : 0 files , 1/129022 clusters
</pre></div>
获得设备之后，我们需要挂载设备，才可以对它进行操作。用mount指令把这块设备映射到一个文件地址：首先创建
<!-- HTML generated using hilite.me -->
<div style="background: #ffffff; overflow:auto;width:auto;border:solid gray;border-width:.1em .1em .1em .8em;padding:.2em .6em;"><pre style="margin: 0; line-height: 125%">$ sudo mkdir /mnt/rd
</pre></div>
接着，映射过去：
<!-- HTML generated using hilite.me -->
<div style="background: #ffffff; overflow:auto;width:auto;border:solid gray;border-width:.1em .1em .1em .8em;padding:.2em .6em;"><pre style="margin: 0; line-height: 125%">$ sudo mount /dev/ram1 /mnt/rd
</pre></div>
这样，我们就可以对/mnt/rd进行常规的文件操作。例如ls、mkdir等等。所有的操作都直接在ram1上生效。
<p>当不再需要ram1的时候，我们可以用umount进行逆向操作（解映射）：</p>
<!-- HTML generated using hilite.me -->
<div style="background: #ffffff; overflow:auto;width:auto;border:solid gray;border-width:.1em .1em .1em .8em;padding:.2em .6em;"><pre style="margin: 0; line-height: 125%">$ sudo umount /mnt/rd
</pre></div>
</ul>
第一步完成！你已经拥有了一个FAT32存储设备，并且把他挂载到了你的操作系统上。现在你可以在/mnt/rd下进行任何常规文件操作。
<br>
<p>接下来，就要运用fread和fseek来读取以byte单位的文件系统信息。</p>
现在我们回过头来，看看FAT32系统中，最前面的几个reserved cluster是什么区域。
在第0个cluster中，存放的是一个成为Boot Sector的结构，也就是文件系统刚刚启动时访问的结构。这之中存储着关键信息：例如设备的cluster总数、每个cluster包括了多少sector、每一个sector有多少byte、有多少FAT区域、root dir在第几个cluster等等。具体的信息，可以参考：<a href="http://wiki.osdev.org/FAT">FAT Wiki</a>中的Programming Guide --- Reading the Boot Sector。所以我们下一步的操作，就是要读取Boot sector，获得最基本的信息。

<h3><a id=3>3.读取Boot Sector</a></h3>
从上面的链接我们可以发现，Boot Sector实际上只是一个C结构体。对于FAT32的版本，表示为：
<!-- HTML generated using hilite.me -->
<div style="background: #f8f8f8; overflow:auto;width:auto;border:solid gray;border-width:.1em .1em .1em .8em;padding:.2em .6em;"><pre style="margin: 0; line-height: 125%"><span style="color: #204a87; font-weight: bold">struct</span> <span style="color: #000000">fat_BS</span>
<span style="color: #000000; font-weight: bold">{</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">char</span>       <span style="color: #000000">bootjmp</span><span style="color: #000000; font-weight: bold">[</span><span style="color: #0000cf; font-weight: bold">3</span><span style="color: #000000; font-weight: bold">];</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">char</span>       <span style="color: #000000">oem_name</span><span style="color: #000000; font-weight: bold">[</span><span style="color: #0000cf; font-weight: bold">8</span><span style="color: #000000; font-weight: bold">];</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">short</span>      <span style="color: #000000">bytes_per_sector</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">char</span>       <span style="color: #000000">sectors_per_cluster</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">short</span>      <span style="color: #000000">reserved_sector_count</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">char</span>       <span style="color: #000000">fat_num</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">short</span>      <span style="color: #000000">root_entry_count</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">short</span>      <span style="color: #000000">total_sectors_16</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">char</span>       <span style="color: #000000">media_type</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">short</span>      <span style="color: #000000">table_size_16</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">short</span>      <span style="color: #000000">sectors_per_track</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">short</span>      <span style="color: #000000">head_side_count</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">int</span>        <span style="color: #000000">hidden_sector_count</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">int</span>        <span style="color: #000000">total_sectors_32</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #8f5902; font-style: italic">//extended fat32 stuff</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">int</span>        <span style="color: #000000">table_size_32</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">short</span>      <span style="color: #000000">extended_flags</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">short</span>      <span style="color: #000000">fat_version</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">int</span>        <span style="color: #000000">root_cluster</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">short</span>      <span style="color: #000000">fat_info</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">short</span>      <span style="color: #000000">backup_BS_sector</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">char</span>       <span style="color: #000000">reserved_0</span><span style="color: #000000; font-weight: bold">[</span><span style="color: #0000cf; font-weight: bold">12</span><span style="color: #000000; font-weight: bold">];</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">char</span>       <span style="color: #000000">drive_number</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">char</span>       <span style="color: #000000">reserved_1</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">char</span>       <span style="color: #000000">boot_signature</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">int</span>        <span style="color: #000000">volume_id</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">char</span>       <span style="color: #000000">volume_label</span><span style="color: #000000; font-weight: bold">[</span><span style="color: #0000cf; font-weight: bold">11</span><span style="color: #000000; font-weight: bold">];</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">char</span>       <span style="color: #000000">fat_type_label</span><span style="color: #000000; font-weight: bold">[</span><span style="color: #0000cf; font-weight: bold">8</span><span style="color: #000000; font-weight: bold">];</span> 
<span style="color: #000000; font-weight: bold">}</span><span style="color: #000000">__attribute__</span><span style="color: #000000; font-weight: bold">((</span><span style="color: #000000">packed</span><span style="color: #000000; font-weight: bold">))</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">;</span>
</pre></div>
<p>上面的__attribute__表示这个结构体在内存中要紧凑排列，不需要对齐。</p>
由于Boot Sector位于第0个cluster（也就是最开始），我们只需要用fread从头进行读取，并不需要fseek查找相应位置。
在传入设备的名称后，我们就可以把BS读取出来：
<!-- HTML generated using hilite.me -->
<div style="background: #f8f8f8; overflow:auto;width:auto;border:solid gray;border-width:.1em .1em .1em .8em;padding:.2em .6em;"><pre style="margin: 0; line-height: 125%"><span style="color: #204a87; font-weight: bold">char</span> <span style="color: #ce5c00; font-weight: bold">*</span> <span style="color: #000000">device</span> <span style="color: #ce5c00; font-weight: bold">=</span> <span style="color: #4e9a06">&quot;/dev/ram1&quot;</span><span style="color: #000000; font-weight: bold">;</span>    
<span style="color: #204a87; font-weight: bold">FILE</span> <span style="color: #ce5c00; font-weight: bold">*</span> <span style="color: #000000">in</span> <span style="color: #ce5c00; font-weight: bold">=</span> <span style="color: #000000">fopen</span><span style="color: #000000; font-weight: bold">(</span><span style="color: #000000">device</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #4e9a06">&quot;rb&quot;</span><span style="color: #000000; font-weight: bold">);</span>
<span style="color: #204a87; font-weight: bold">if</span> <span style="color: #000000; font-weight: bold">(</span><span style="color: #000000">in</span> <span style="color: #ce5c00; font-weight: bold">==</span> <span style="color: #204a87">NULL</span><span style="color: #000000; font-weight: bold">)</span>  <span style="color: #000000; font-weight: bold">{</span>
    <span style="color: #000000">perror</span><span style="color: #000000; font-weight: bold">(</span><span style="color: #4e9a06">&quot;error&quot;</span><span style="color: #000000; font-weight: bold">);</span>
    <span style="color: #204a87; font-weight: bold">return</span><span style="color: #000000; font-weight: bold">;</span>
<span style="color: #000000; font-weight: bold">}</span>
<span style="color: #000000">fread</span><span style="color: #000000; font-weight: bold">(</span><span style="color: #ce5c00; font-weight: bold">&amp;</span><span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #204a87; font-weight: bold">sizeof</span><span style="color: #000000; font-weight: bold">(</span><span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">),</span> <span style="color: #0000cf; font-weight: bold">1</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">in</span><span style="color: #000000; font-weight: bold">);</span>
</pre></div>
尝试把BS中的信息输出:
<!-- HTML generated using hilite.me -->
<div style="background: #f8f8f8; overflow:auto;width:auto;border:solid gray;border-width:.1em .1em .1em .8em;padding:.2em .6em;"><pre style="margin: 0; line-height: 125%"><span style="color: #204a87; font-weight: bold">void</span> <span style="color: #000000">printBSinfo</span><span style="color: #000000; font-weight: bold">(){</span>
        <span style="color: #000000">printf</span><span style="color: #000000; font-weight: bold">(</span><span style="color: #4e9a06">&quot;boot sector: jmpboot: %s \n \</span>
<span style="color: #4e9a06">            oem_name: %s\n \</span>
<span style="color: #4e9a06">            bytes_per_sector: %d\n \</span>
<span style="color: #4e9a06">            sectors_per_cluster: %d\n \</span>
<span style="color: #4e9a06">            reserved_sector_count: %d\n \</span>
<span style="color: #4e9a06">            fat_num: %d\n \</span>
<span style="color: #4e9a06">            root_entry_count: %d\n \</span>
<span style="color: #4e9a06">            total_sectors_16: %d\n \</span>
<span style="color: #4e9a06">            media_type: %c\n \</span>
<span style="color: #4e9a06">            table_size_16: %d\n \</span>
<span style="color: #4e9a06">            sectors_per_track: %d\n \</span>
<span style="color: #4e9a06">            head_side_count: %d\n \</span>
<span style="color: #4e9a06">            hidden_sector_count: %d\n \</span>
<span style="color: #4e9a06">            total_sectors_32: %d\n \</span>
<span style="color: #4e9a06">            table_size_32: %d\n \</span>
<span style="color: #4e9a06">            extended_flags: %d\n \</span>
<span style="color: #4e9a06">            fat_version: %d\n \</span>
<span style="color: #4e9a06">            root_cluster: %d\n \</span>
<span style="color: #4e9a06">            fat_info: %d\n \</span>
<span style="color: #4e9a06">            backup_BS_sector: %d\n \</span>
<span style="color: #4e9a06">            reserved_0: %s\n \</span>
<span style="color: #4e9a06">            drive_number: %d\n \</span>
<span style="color: #4e9a06">            reserved_1: %d\n \</span>
<span style="color: #4e9a06">            boot_signature: %d\n \</span>
<span style="color: #4e9a06">            volume_id: %d\n \</span>
<span style="color: #4e9a06">            volume_label: %s\n \</span>
<span style="color: #4e9a06">            fat_type_label: %s\n&quot;</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">bootjmp</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">oem_name</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">bytes_per_sector</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">sectors_per_cluster</span><span style="color: #000000; font-weight: bold">,</span>
            <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">reserved_sector_count</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">fat_num</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">root_entry_count</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">total_sectors_16</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">media_type</span><span style="color: #000000; font-weight: bold">,</span>
            <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">table_size_16</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">sectors_per_track</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">head_side_count</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">hidden_sector_count</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">total_sectors_32</span><span style="color: #000000; font-weight: bold">,</span>
            <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">table_size_32</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">extended_flags</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">fat_version</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">root_cluster</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">fat_info</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">backup_BS_sector</span><span style="color: #000000; font-weight: bold">,</span>
            <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">reserved_0</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">drive_number</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">reserved_1</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">boot_signature</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">volume_id</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">volume_label</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">fat_type_label</span><span style="color: #000000; font-weight: bold">);</span>
<span style="color: #000000; font-weight: bold">}</span>
</pre></div>
你会发现和用dosfsck显示的结果一一对应。
很简单，是吧？现在你已经越过操作系统，亲自和文件系统打交道了，有没有成就感？

<h3><a id=4>4.读取Root Directory</a></h3>
在获得BS中的关键信息之后，我们就来读取Root Direcotry结构。注意，Root Direcotry是在FAT区域之后的，而我们发现，BS结构体中，就拥有表示FAT占用cluster总数的变量，以及reserved clusters总数的变量（也就是之前图中FAT前面那些cluster）。那么获取Root Directory的地址也就轻轻松松：
<!-- HTML generated using hilite.me --><div style="background: #f8f8f8; overflow:auto;width:auto;border:solid gray;border-width:.1em .1em .1em .8em;padding:.2em .6em;"><pre style="margin: 0; line-height: 125%"> <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">int</span> <span style="color: #000000">ROOT_START</span> <span style="color: #ce5c00; font-weight: bold">=</span> <span style="color: #000000; font-weight: bold">(</span><span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">reserved_sector_count</span> <span style="color: #ce5c00; font-weight: bold">+</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">table_size_32</span> <span style="color: #ce5c00; font-weight: bold">*</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">fat_num</span><span style="color: #000000; font-weight: bold">)</span> <span style="color: #ce5c00; font-weight: bold">*</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">bytes_per_sector</span><span style="color: #000000; font-weight: bold">;</span>
</pre></div>
由于之后我们需要用fseek进行定位，所以这里ROOT_START表示的offset以byte为单位。
<p>对了，fseek与fread的详细用法，请参考cplusplus中的说明。fseek是用来把文件描述符in定位到某个地方，它是以byte为单位来移动的。</p>
找到ROOT DIRECTORY的位置之后，我们就可以连续地读取File Entry了！不过你得先在/mnt/rd里添加一些文件（要不怎么有file）。例如，我添加了a.txt。那么我们可以设想，在读取file entry的时候，他会输出关于a.txt的信息。
<p>File Entry也是一个C结构体，具体表示为:</p>
<!-- HTML generated using hilite.me -->
<div style="background: #f8f8f8; overflow:auto;width:auto;border:solid gray;border-width:.1em .1em .1em .8em;padding:.2em .6em;"><pre style="margin: 0; line-height: 125%"><span style="color: #204a87; font-weight: bold">struct</span> <span style="color: #000000">DirEntry</span>
<span style="color: #000000; font-weight: bold">{</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">char</span> <span style="color: #000000">name</span><span style="color: #000000; font-weight: bold">[</span><span style="color: #0000cf; font-weight: bold">11</span><span style="color: #000000; font-weight: bold">];</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">char</span> <span style="color: #000000">attr</span><span style="color: #000000; font-weight: bold">;</span> 
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">char</span> <span style="color: #000000">res</span><span style="color: #000000; font-weight: bold">;</span>
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">char</span> <span style="color: #000000">crt_time_tenth</span><span style="color: #000000; font-weight: bold">;</span> 
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">short</span> <span style="color: #000000">crt_time</span><span style="color: #000000; font-weight: bold">;</span> 
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">short</span> <span style="color: #000000">crt_date</span><span style="color: #000000; font-weight: bold">;</span> 
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">short</span> <span style="color: #000000">last_access_date</span><span style="color: #000000; font-weight: bold">;</span> 
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">short</span> <span style="color: #000000">first_hi</span><span style="color: #000000; font-weight: bold">;</span> 
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">short</span> <span style="color: #000000">written_time</span><span style="color: #000000; font-weight: bold">;</span> 
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">short</span> <span style="color: #000000">written_date</span><span style="color: #000000; font-weight: bold">;</span> 
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">short</span> <span style="color: #000000">first_lo</span><span style="color: #000000; font-weight: bold">;</span> 
    <span style="color: #204a87; font-weight: bold">unsigned</span> <span style="color: #204a87; font-weight: bold">long</span> <span style="color: #000000">filesize</span><span style="color: #000000; font-weight: bold">;</span>
<span style="color: #000000; font-weight: bold">};</span>
</pre></div>
其中，first_hi与first_lo记录了该文件第一个cluster的高位与低位。
尝试把它读进来：
<!-- HTML generated using hilite.me -->
<div style="background: #f8f8f8; overflow:auto;width:auto;border:solid gray;border-width:.1em .1em .1em .8em;padding:.2em .6em;"><pre style="margin: 0; line-height: 125%"><span style="color: #204a87; font-weight: bold">int</span> <span style="color: #000000">cluster</span> <span style="color: #ce5c00; font-weight: bold">=</span> <span style="color: #0000cf; font-weight: bold">2</span><span style="color: #000000; font-weight: bold">;</span>
<span style="color: #000000">fseek</span><span style="color: #000000; font-weight: bold">(</span><span style="color: #000000">in</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">ROOT_START</span> <span style="color: #ce5c00; font-weight: bold">+</span> <span style="color: #000000; font-weight: bold">(</span><span style="color: #000000">cluster</span><span style="color: #ce5c00; font-weight: bold">-</span><span style="color: #0000cf; font-weight: bold">2</span><span style="color: #000000; font-weight: bold">)</span> <span style="color: #ce5c00; font-weight: bold">*</span> <span style="color: #000000">BS</span><span style="color: #000000; font-weight: bold">.</span><span style="color: #000000">bytes_per_sector</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">SEEK_SET</span><span style="color: #000000; font-weight: bold">);</span>
<span style="color: #000000">fread</span><span style="color: #000000; font-weight: bold">(</span><span style="color: #ce5c00; font-weight: bold">&amp;</span><span style="color: #000000">entry</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #204a87; font-weight: bold">sizeof</span><span style="color: #000000; font-weight: bold">(</span><span style="color: #000000">entry</span><span style="color: #000000; font-weight: bold">),</span> <span style="color: #0000cf; font-weight: bold">1</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">in</span><span style="color: #000000; font-weight: bold">);</span>
<span style="color: #000000">printentry</span><span style="color: #000000; font-weight: bold">(</span><span style="color: #000000">entry</span><span style="color: #000000; font-weight: bold">);</span>
</pre></div>
这时，a.txt的信息应该就会输出在屏幕上。你可能会注意到，为什么我写了一个cluster-2？这里涉及到一个尝试：Root directory的第一个cluster编号是2（这里编号指的是FAT之后的cluster编号），不过cluster0和1根本就不存在，也就是说，FAT之后第一个cluster的编号就是2。所以我们在读取的时候，Root directory应该紧挨着FAT区域读取，也就是要对cluster进行-2操作。当然，之后读取所有FILE ENTRY中表示文件的第一个cluster的值的时候，我们也都需要进行-2操作。
<p>读取file entry似乎很简单，不过，我们如何知道哪里是root directory的结束呢？如何知道root directory中有多少文件（file entry）？又如何读取root directory下的sub directories呢？</p>

<h3><a id=5>5.FAT（File Allocate Table）</a></h3>
解决上面的问题，需要用到我们的FAT。回想刚刚的内容，FAT表记录着cluster间的连接关系，如果一个cluster之后连接为空，那么自然这一条链到了尽头。那么我们就可以想到这样一个解决方案：如果想遍历整个文件夹的file entries，我们就遍历这个文件夹的所有cluster。而我们在只知道该文件夹第一个file cluster信息的情况下，需要对照FAT中相应cluster中的值，来依次获取下一个cluster的地址。直到下一个地址为空。这样就可以遍历整个文件夹（实际上遍历某个文件的操作也是如此）。
<p>这里我们要注意一下，FAT32中，每一个file entry的大小是32Byte，而一个cluster可能有上百上千个Byte，所以会出现占用了一个cluster但是并没有完全利用的情况，这种情况我们等下详谈。</p>
有了明晰的思路后，代码就不难写出来，这里写一个大体的思路：
<!-- HTML generated using hilite.me -->
<div style="background: #f8f8f8; overflow:auto;width:auto;border:solid gray;border-width:.1em .1em .1em .8em;padding:.2em .6em;"><pre style="margin: 0; line-height: 125%"><span style="color: #8f5902; font-style: italic">// go to first cluster</span>
<span style="color: #000000">fseek</span><span style="color: #000000; font-weight: bold">(</span><span style="color: #000000">in</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">data_start</span> <span style="color: #ce5c00; font-weight: bold">+</span> <span style="color: #000000; font-weight: bold">(</span><span style="color: #000000">cluster</span><span style="color: #ce5c00; font-weight: bold">-</span><span style="color: #0000cf; font-weight: bold">2</span><span style="color: #000000; font-weight: bold">)</span> <span style="color: #ce5c00; font-weight: bold">*</span> <span style="color: #000000">cluster_size</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">SEEK_SET</span><span style="color: #000000; font-weight: bold">);</span>
<span style="color: #000000">fread</span><span style="color: #000000; font-weight: bold">(</span><span style="color: #000000">buffer</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #0000cf; font-weight: bold">1</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #204a87; font-weight: bold">sizeof</span><span style="color: #000000; font-weight: bold">(</span><span style="color: #000000">buffer</span><span style="color: #000000; font-weight: bold">),</span> <span style="color: #000000">in</span><span style="color: #000000; font-weight: bold">);</span>
<span style="color: #8f5902; font-style: italic">// do something with data</span>

<span style="color: #8f5902; font-style: italic">// go to fat[cluster]</span>
<span style="color: #000000">fseek</span><span style="color: #000000; font-weight: bold">(</span><span style="color: #000000">in</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">fat_start</span> <span style="color: #ce5c00; font-weight: bold">+</span> <span style="color: #000000">cluste</span> <span style="color: #ce5c00; font-weight: bold">*</span> <span style="color: #0000cf; font-weight: bold">4</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">SEEK_SET</span><span style="color: #000000; font-weight: bold">);</span>
<span style="color: #000000">fread</span><span style="color: #000000; font-weight: bold">(</span><span style="color: #ce5c00; font-weight: bold">&amp;</span><span style="color: #000000">cluster</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #0000cf; font-weight: bold">4</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #0000cf; font-weight: bold">1</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">in</span><span style="color: #000000; font-weight: bold">);</span>
<span style="color: #000000">cluster</span> <span style="color: #ce5c00; font-weight: bold">&amp;=</span> <span style="color: #0000cf; font-weight: bold">0x0FFFFFFF</span><span style="color: #000000; font-weight: bold">;</span>

<span style="color: #8f5902; font-style: italic">// go next cluster</span>
<span style="color: #000000">fseek</span><span style="color: #000000; font-weight: bold">(</span><span style="color: #000000">in</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">data_start</span> <span style="color: #ce5c00; font-weight: bold">+</span> <span style="color: #000000; font-weight: bold">(</span><span style="color: #000000">cluster</span><span style="color: #ce5c00; font-weight: bold">-</span><span style="color: #0000cf; font-weight: bold">2</span><span style="color: #000000; font-weight: bold">)</span> <span style="color: #ce5c00; font-weight: bold">*</span> <span style="color: #000000">cluster_size</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">SEEK_SET</span><span style="color: #000000; font-weight: bold">);</span>
<span style="color: #000000; font-weight: bold">...</span>
</pre></div>

先找到第一个cluster，然后读取内容，之后再通过FAT找第二个cluster...注意，这里的buffer的大小与一个cluster相当，所以可能包括了很多file entry。
<p>当然，你需要用循环来实现对文件夹的遍历。并且需要判断何时是链条的终止（FAT32中，链表终止表示为对应FAT[]单元的值大于等于0x0FFFFFF8）</p>
<p>你可能注意到了一行代码：cluster &= 0x0FFFFFFF;</p>
<p>为什么要把最高的四位变为0呢？微软再设计FAT中每个单元的时候，把表示下一个cluster地址的有效位规定为28bits，而非32bit，而FAT32中每一个单元为32bit，所以我们要忽略最高的4位。在fseek与fread中，4表示一个FAT单元的长度（4个byte = 32bit）。</p>
我想你应该可以实现把整个文件夹遍历的功能了。子文件夹应该也不在话下（只需要对比一下文件名就好）。甚至你已经可以遍历某个文件了（与遍历文件夹的操作相同）。是时候把一切结合起来，做一个完整的遍历功能了！
<h3><a id=6>6.结合起来</a></h3>
当我们把代码组合到一起，执行上述的时候，会发现有一些奇怪的现象：例如有些文件的size = -1，而他们的文件名是大小写结合（原文件只有小写）：例如一个文件夹有a.txt，则会输出A.TXT 与Aa.TXT; 或者长文件名的文件/文件夹不会输出，而是用另一种形式表示：例如ABCDEFGHI.TXT表示为ABCDEF~1.TXT等等。
<p>这些都涉及到一个问题：LFN</p>
<p>什么是LFN？我想你可能在看到FILE ENTRY的结构体内部后，会有一个问题在心中：name只有11个字符长度，那么如果我的文件/文件夹名字超过11个呢？微软在规定FAT32的时候，使用的是8+3命名规则，也就是扩展名最多3位，文件/文件夹名最多8位字符。但是我们明明可以创建长名文件与文件夹呀！这时候FAT32会怎么做呢？它会给相应的文件/文件夹创建一个LFN结构，每个LFN大小与File entry相同（你可以把LFN看做是一个FIle entry），但是他的ATTRIBUTE有特殊的表示。这个LFN只存储长文件名，其他都交给另一个标准的8+3结构的FILE ENTRY来存储。也就是说，一个长名文件/文件夹会有两个FILE ENTRY，一个是LFN负责存储文件名，一个是8+3的file entry，存储常规的信息。然而第二个File Entry中的文件名就被截取了（也就是我们看到的*~1）。而小写名字也会被创建对应的LFN，以区分大小写不同的文件。</p>
<P>如何识别LFN呢？我们只需要查看他的attribute变量。</P>
<img src="http://www.engineersgarage.com/sites/default/files/imagecache/Original/wysiwyg_imageupload/28714/FS%20Table.JPG" alt="cluster" height="" width="" style="display: block; margin-left: auto; margin-right: auto">
FILE ENTRY 结构体中的attribute是一个8 bits的变量，每一个bit 为1时表示具有相关属性。如果前四个bit都是1，证明这是一个LFN。
<p>所以在输出的时候，我们只需要跳过这些LFN文件就可以了。</p>
<!-- HTML generated using hilite.me -->
<div style="background: #ffffff; overflow:auto;width:auto;border:solid gray;border-width:.1em .1em .1em .8em;padding:.2em .6em;"><pre style="margin: 0; line-height: 125%">zmr@linux:~# ./list_root_dir
1, MAKEFILE, 21, 11
2, AC.TXT, 4096, 10
3, TEST.C, 1023, 12
4, HELLO.MP3, 4194304, 14
5, TEMPOR~1/, 0, 100
6, THISIS~1.TXT, 1000, 19
</pre></div>
我们可以看到，tempor~1是一个长名子文件夹，而thisis~1.txt是一个长名文本文件。

<p>写到这里，希望你对文件系统，特别是FAT32的了解更加深入。文件系统是操作系统中十分关键的一环（说最关键也不为过），因此了解它的运作机理，对整个操作系统的认识都会有所提升。作为这篇文章的拓展，你可以尝试去实现一个恢复误删文件的程序（比如最基础的，只恢复大小为1个cluster的文件）。如果你感兴趣的话，可以看看恢复文件的机理，以及其他文件系统是如何实现的。</p>

<p>今天就到这里啦！下周见~</p>

<hr>
<p><strong>本文参考</strong></p>
<li><a href="http://wiki.osdev.org/FAT" target="_blank">FAT Wiki</a></li>
<li><a href="https://www.pjrc.com/tech/8051/ide/fat32.html" target="_blank">Understanding FAT32 Filesystem</a></li>
<li><a href="http://codeandlife.com/2012/04/02/simple-fat-and-sd-tutorial-part-1/" target="_blank">Simple FAT and SD Tutorial Part 1</a></li>
<li><a href="http://codeandlife.com/2012/04/07/simple-fat-and-sd-tutorial-part-2/" target="_blank">Simple FAT and SD Tutorial Part 2</a></li>