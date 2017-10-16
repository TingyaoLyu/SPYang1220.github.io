---
layout: post
date: 2015-09-27 05:56:14
title: "一步一步来，写一个简易shell（基础篇）"
category: posts
comments: true
tags: [programming, operating system]
---

<h3>一</h3>
正在上的操作系统课布置了一项很有趣的作业，写一个简易的shell。刚刚把我的任务做完，来分享一下。

这是目录：
<li><a href="#a0">shell第零步：写shell前需要知道什么</a></li>
<li><a href="#a1">shell第一步：处理输入</a></li>
<li><a href="#a2">shell第二步：内部命令</a></li>
<li><a href="#a3">shell第三步：执行程序</a></li>
<li><a href="#a4">shell第四步：信号处理</a></li>
<li><a href="#a5">shell第五步：pipeline管道</a></li>
<li><a href="#a6">shell番外步：让你的shell更像shell</a></li>

下面，开始咯~

<h3 id="a0"> shell第零步：写shell前需要知道什么 </h3>
<p>是程序员一定都不会对shell感到陌生，哪怕你是一个windows程序员：）。通俗点来讲，shell就是一个解析输入命令并且执行其他程序的媒介，大家常用的GUI（图形界面），其实就是shell的漂亮包装。如果你不了解或不熟悉shell，请移步谷歌搜索</p>
<p>shell版本有很多，例如mac平台上的terminal，就包含了好多shell:bash, zsh, ksh等等(terminal本身只是个程序，不是shell)， 我现在用的是fish，推荐一下，自动补全很强大，非常好用。</p>
<p>怎么写一个shell呢？其实，一个简单地shell说白了就是几个方面：怎么处理输入？怎么调用程序？怎么利用操作系统特性调度程序？但每一方面都需要审慎的设计与考虑。</p>
<p>给大家推荐一些有用的资源：</p>
<ul><a href="http://linux.die.net/man/">http://linux.die.net/man/</a> linux 函数的说明网站，很详细，遇到不懂的上去查就好了</ul>
<ul><a href="http://man7.org/linux/man-pages/">http://man7.org/linux/man-pages/</a> 同样一个很好的linux man page</ul>
<ul><a href="http://www.gnu.org/software/libc/manual/html_node/">http://www.gnu.org/software/libc/manual/html_node/</a>介绍了glibC的具体实现，有很多有用的部分可以参考</ul>
<ul>谷歌 神器不解释</ul>

<h3 id="a1">shell第一步：处理输入</h3>
<p>开始了！第一步是对输入字符串的处理。这一步最简单，但稍不留神就会留下很多陷阱，深处的bug甚至会殃及后面的很多步骤。所以要考虑周到所有情况。</p>
<p>由于我们这里完成的是简易的shell，并不需要很复杂的处理功能。我们规定输入的语法为(单个命令)：
<br>
``[command] [arg]* `` or ``([command] [arg]* |)* [command] [arg]`` 
</br>
<p>*的意思是可以出现任意次。第二种语法加上了`|`，是管道的意思，这个会在第五步讨论。
为了简单，我们还要规定，命令中不会出现``> < ! ' " ``等奇怪的字符。</p>
<p>首先介绍三个有用的函数:``fgets()``,``strchr()``,``strtok()``。关于他们的用法以及注意事项，请前往linux man page查看。第一个是接受字符串输入的函数，需要设定最大字符串大小（为了防止栈溢出，比gets()更加安全）。第二个是查找某个字符在字符串中的位置。第三个是用来分隔字符串用的。</p>
首先我们需要对输入的字符串进行瘦身操作，即去掉首尾的空格。代码如下（原谅我的命名方式）：
<pre style='color:#000000;background:#f1f0f0;'><span style='color:#400000; font-weight:bold; '>char</span> <span style='color:#806030; '>*</span> crop_blank<span style='color:#806030; '>(</span><span style='color:#400000; font-weight:bold; '>char</span> <span style='color:#806030; '>*</span><span style='color:#806030; '>&amp;</span> input<span style='color:#806030; '>)</span><span style='color:#806030; '>{</span>
    <span style='color:#400000; font-weight:bold; '>int</span> a<span style='color:#806030; '>,</span> b<span style='color:#806030; '>;</span>
    a <span style='color:#806030; '>=</span> <span style='color:#c00000; '>0</span><span style='color:#806030; '>,</span> b <span style='color:#806030; '>=</span> <span style='color:#806030; '>-</span><span style='color:#c00000; '>1</span><span style='color:#806030; '>;</span>
    <span style='color:#400000; font-weight:bold; '>for</span> <span style='color:#806030; '>(</span><span style='color:#400000; font-weight:bold; '>int</span> i <span style='color:#806030; '>=</span> <span style='color:#c00000; '>0</span> <span style='color:#806030; '>;</span> i <span style='color:#806030; '>&lt;</span> <span style='color:#800040; '>strlen</span><span style='color:#806030; '>(</span>input<span style='color:#806030; '>)</span> <span style='color:#806030; '>-</span> <span style='color:#c00000; '>1</span><span style='color:#806030; '>;</span> <span style='color:#806030; '>+</span><span style='color:#806030; '>+</span>i<span style='color:#806030; '>)</span>
        <span style='color:#400000; font-weight:bold; '>if</span> <span style='color:#806030; '>(</span>input<span style='color:#806030; '>[</span>i<span style='color:#806030; '>]</span> <span style='color:#806030; '>!</span><span style='color:#806030; '>=</span> <span style='color:#008000; '>' '</span><span style='color:#806030; '>)</span><span style='color:#806030; '>{</span>
            a <span style='color:#806030; '>=</span> i<span style='color:#806030; '>;</span> <span style='color:#400000; font-weight:bold; '>break</span><span style='color:#806030; '>;</span>
        <span style='color:#806030; '>}</span>
    <span style='color:#400000; font-weight:bold; '>for</span> <span style='color:#806030; '>(</span><span style='color:#400000; font-weight:bold; '>int</span> i <span style='color:#806030; '>=</span> <span style='color:#800040; '>strlen</span><span style='color:#806030; '>(</span>input<span style='color:#806030; '>)</span> <span style='color:#806030; '>-</span> <span style='color:#c00000; '>1</span><span style='color:#806030; '>;</span> i <span style='color:#806030; '>></span><span style='color:#806030; '>=</span> <span style='color:#c00000; '>0</span><span style='color:#806030; '>;</span> <span style='color:#806030; '>-</span><span style='color:#806030; '>-</span>i<span style='color:#806030; '>)</span><span style='color:#806030; '>{</span>
        <span style='color:#400000; font-weight:bold; '>if</span> <span style='color:#806030; '>(</span>input<span style='color:#806030; '>[</span>i<span style='color:#806030; '>]</span> <span style='color:#806030; '>!</span><span style='color:#806030; '>=</span> <span style='color:#008000; '>' '</span> <span style='color:#806030; '>&amp;</span><span style='color:#806030; '>&amp;</span> input<span style='color:#806030; '>[</span>i<span style='color:#806030; '>]</span> <span style='color:#806030; '>!</span><span style='color:#806030; '>=</span> <span style='color:#008000; '>'\n'</span> <span style='color:#806030; '>&amp;</span><span style='color:#806030; '>&amp;</span> input<span style='color:#806030; '>[</span>i<span style='color:#806030; '>]</span> <span style='color:#806030; '>!</span><span style='color:#806030; '>=</span> <span style='color:#008000; '>'\t'</span><span style='color:#806030; '>)</span><span style='color:#806030; '>{</span>
            b <span style='color:#806030; '>=</span> i<span style='color:#806030; '>;</span> <span style='color:#400000; font-weight:bold; '>break</span><span style='color:#806030; '>;</span>
        <span style='color:#806030; '>}</span>
    <span style='color:#806030; '>}</span>
    input<span style='color:#806030; '>[</span>b<span style='color:#806030; '>+</span><span style='color:#c00000; '>1</span><span style='color:#806030; '>]</span> <span style='color:#806030; '>=</span> <span style='color:#008000; '>'\0'</span><span style='color:#806030; '>;</span>
    <span style='color:#400000; font-weight:bold; '>return</span> input<span style='color:#806030; '>+</span>a<span style='color:#806030; '>;</span>
<span style='color:#806030; '>}</span>
</pre>
接下来，就是对语句进行分割。首先我们检查一下有没有非法输入的存在：
<pre style='color:#000000;background:#f1f0f0;'><span style='color:#c34e00; '>// '|' at last</span>
    <span style='color:#400000; font-weight:bold; '>if</span> <span style='color:#806030; '>(</span>input<span style='color:#806030; '>[</span><span style='color:#800040; '>strlen</span><span style='color:#806030; '>(</span>input<span style='color:#806030; '>)</span> <span style='color:#806030; '>-</span> <span style='color:#c00000; '>1</span><span style='color:#806030; '>]</span> <span style='color:#806030; '>=</span><span style='color:#806030; '>=</span> <span style='color:#008000; '>'|'</span><span style='color:#806030; '>)</span> <span style='color:#806030; '>{</span>
        <span style='color:#800040; '>fprintf</span><span style='color:#806030; '>(</span><span style='color:#800040; '>stderr</span><span style='color:#806030; '>,</span> <span style='color:#800000; '>"</span><span style='color:#e60000; '>unrecognized input</span><span style='color:#0f6900; '>\n</span><span style='color:#800000; '>"</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span> <span style='color:#400000; font-weight:bold; '>return</span><span style='color:#806030; '>;</span>
    <span style='color:#806030; '>}</span><span style='color:#806030; '>;</span>
<span style='color:#c34e00; '>//illegal char</span>
    <span style='color:#400000; font-weight:bold; '>if</span> <span style='color:#806030; '>(</span> <span style='color:#007d45; '>NULL</span> <span style='color:#806030; '>!</span><span style='color:#806030; '>=</span> <span style='color:#800040; '>strchr</span><span style='color:#806030; '>(</span>input<span style='color:#806030; '>,</span><span style='color:#008000; '>'>'</span><span style='color:#806030; '>)</span> <span style='color:#806030; '>|</span><span style='color:#806030; '>|</span> <span style='color:#007d45; '>NULL</span> <span style='color:#806030; '>!</span><span style='color:#806030; '>=</span> <span style='color:#800040; '>strchr</span><span style='color:#806030; '>(</span>input<span style='color:#806030; '>,</span><span style='color:#008000; '>'&lt;'</span><span style='color:#806030; '>)</span> <span style='color:#806030; '>|</span><span style='color:#806030; '>|</span> <span style='color:#007d45; '>NULL</span> <span style='color:#806030; '>!</span><span style='color:#806030; '>=</span> <span style='color:#800040; '>strchr</span><span style='color:#806030; '>(</span>input<span style='color:#806030; '>,</span><span style='color:#008000; '>'!'</span><span style='color:#806030; '>)</span> <span style='color:#806030; '>|</span><span style='color:#806030; '>|</span> 
        <span style='color:#007d45; '>NULL</span> <span style='color:#806030; '>!</span><span style='color:#806030; '>=</span> <span style='color:#800040; '>strchr</span><span style='color:#806030; '>(</span>input<span style='color:#806030; '>,</span><span style='color:#c00000; '>96</span><span style='color:#806030; '>)</span> <span style='color:#806030; '>|</span><span style='color:#806030; '>|</span> <span style='color:#007d45; '>NULL</span> <span style='color:#806030; '>!</span><span style='color:#806030; '>=</span> <span style='color:#800040; '>strchr</span><span style='color:#806030; '>(</span>input<span style='color:#806030; '>,</span><span style='color:#c00000; '>39</span><span style='color:#806030; '>)</span> <span style='color:#806030; '>|</span><span style='color:#806030; '>|</span> <span style='color:#007d45; '>NULL</span> <span style='color:#806030; '>!</span><span style='color:#806030; '>=</span> <span style='color:#800040; '>strchr</span><span style='color:#806030; '>(</span>input<span style='color:#806030; '>,</span><span style='color:#c00000; '>34</span><span style='color:#806030; '>)</span> <span style='color:#806030; '>)</span><span style='color:#806030; '>{</span>
        <span style='color:#800040; '>fprintf</span><span style='color:#806030; '>(</span><span style='color:#800040; '>stderr</span><span style='color:#806030; '>,</span> <span style='color:#800000; '>"</span><span style='color:#e60000; '>unrecognized input</span><span style='color:#0f6900; '>\n</span><span style='color:#800000; '>"</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span> <span style='color:#400000; font-weight:bold; '>return</span><span style='color:#806030; '>;</span>
    <span style='color:#806030; '>}</span>
</pre>
<p>然后，我们用strtok进行代码分段，也就是把用空格隔开的代码一一装入到一个char\*数组中。具体实现请参考strtok的说明网站。</p>
<p>到目前为止，一个初步的字符处理功能就完成了。</p>


<h3 id="a2">shell第二步：内部命令</h3>
处理完字符串后，我们需要知道具体要执行什么任务。这里我们讨论当输入为内部命令（即系统本身命令）的情况。介绍两个命令：exit, cd
<p>有用的函数：``strcmp``用来比较字符串是否相同</p>
<p>exit是终止的命令，程序接受这个命令后就会自动停止运行。因此这个功能的实现很简单，只需要比较输入是否与exit相等就好。但要注意，exit是没有参数的，也就是说如果上一步处理的字符串分隔后数量大于一，你的shell就不会退出，并且要给出相关错误提示。
<p>cd是进入某个目录的命令。这里我们要用到``chdir``函数。``chdir``接受的参数分为两种，绝对路径以及相对路径。以'/'开头是绝对路径。

以下是我的实现:
<pre style='color:#000000;background:#f1f0f0;'><span style='color:#c34e00; '>//command 'cd'</span>
    <span style='color:#400000; font-weight:bold; '>if</span> <span style='color:#806030; '>(</span><span style='color:#806030; '>!</span><span style='color:#800040; '>strcmp</span><span style='color:#806030; '>(</span><span style='color:#800000; '>"</span><span style='color:#e60000; '>cd</span><span style='color:#800000; '>"</span><span style='color:#806030; '>,</span> <span style='color:#800000; font-weight:bold; '>arg</span><span style='color:#806030; '>[</span><span style='color:#c00000; '>0</span><span style='color:#806030; '>]</span><span style='color:#806030; '>)</span><span style='color:#806030; '>)</span><span style='color:#806030; '>{</span>
        <span style='color:#400000; font-weight:bold; '>if</span> <span style='color:#806030; '>(</span>argnum <span style='color:#806030; '>></span> <span style='color:#c00000; '>2</span><span style='color:#806030; '>)</span><span style='color:#806030; '>{</span> <span style='color:#800040; '>fprintf</span><span style='color:#806030; '>(</span><span style='color:#800040; '>stderr</span><span style='color:#806030; '>,</span> <span style='color:#800000; '>"</span><span style='color:#e60000; '>cd: wrong number of arguments</span><span style='color:#0f6900; '>\n</span><span style='color:#800000; '>"</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span> <span style='color:#400000; font-weight:bold; '>return</span><span style='color:#806030; '>;</span> <span style='color:#806030; '>}</span>
        <span style='color:#400000; font-weight:bold; '>if</span> <span style='color:#806030; '>(</span>argnum <span style='color:#806030; '>=</span><span style='color:#806030; '>=</span> <span style='color:#c00000; '>1</span><span style='color:#806030; '>)</span> <span style='color:#400000; font-weight:bold; '>return</span><span style='color:#806030; '>;</span>
        <span style='color:#400000; font-weight:bold; '>if</span> <span style='color:#806030; '>(</span>chdir<span style='color:#806030; '>(</span><span style='color:#800000; font-weight:bold; '>arg</span><span style='color:#806030; '>[</span><span style='color:#c00000; '>1</span><span style='color:#806030; '>]</span><span style='color:#806030; '>)</span> <span style='color:#806030; '>!</span><span style='color:#806030; '>=</span> <span style='color:#c00000; '>0</span><span style='color:#806030; '>)</span> <span style='color:#800040; '>fprintf</span><span style='color:#806030; '>(</span><span style='color:#800040; '>stderr</span><span style='color:#806030; '>,</span> <span style='color:#800000; '>"</span><span style='color:#007997; '>%s</span><span style='color:#e60000; '>: cannot change directory</span><span style='color:#0f6900; '>\n</span><span style='color:#800000; '>"</span><span style='color:#806030; '>,</span> <span style='color:#800000; font-weight:bold; '>arg</span><span style='color:#806030; '>[</span><span style='color:#c00000; '>1</span><span style='color:#806030; '>]</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
        <span style='color:#400000; font-weight:bold; '>return</span><span style='color:#806030; '>;</span>
    <span style='color:#806030; '>}</span> 
<span style='color:#c34e00; '>//command 'exit'</span>
    <span style='color:#400000; font-weight:bold; '>else</span> <span style='color:#400000; font-weight:bold; '>if</span> <span style='color:#806030; '>(</span><span style='color:#806030; '>!</span><span style='color:#800040; '>strcmp</span><span style='color:#806030; '>(</span><span style='color:#800000; '>"</span><span style='color:#e60000; '>exit</span><span style='color:#800000; '>"</span><span style='color:#806030; '>,</span> <span style='color:#800000; font-weight:bold; '>arg</span><span style='color:#806030; '>[</span><span style='color:#c00000; '>0</span><span style='color:#806030; '>]</span><span style='color:#806030; '>)</span><span style='color:#806030; '>)</span><span style='color:#806030; '>{</span>
        <span style='color:#400000; font-weight:bold; '>if</span> <span style='color:#806030; '>(</span>argnum <span style='color:#806030; '>></span> <span style='color:#c00000; '>1</span><span style='color:#806030; '>)</span><span style='color:#806030; '>{</span> <span style='color:#800040; '>fprintf</span><span style='color:#806030; '>(</span><span style='color:#800040; '>stderr</span><span style='color:#806030; '>,</span> <span style='color:#800000; '>"</span><span style='color:#e60000; '>exit: wrong number of arguments</span><span style='color:#0f6900; '>\n</span><span style='color:#800000; '>"</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span> <span style='color:#400000; font-weight:bold; '>return</span><span style='color:#806030; '>;</span> <span style='color:#806030; '>}</span>
        <span style='color:#800040; '>exit</span><span style='color:#806030; '>(</span><span style='color:#c00000; '>0</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
    <span style='color:#806030; '>}</span>
</pre>

<h3 id="a3">shell第三步：执行程序</h3>
这一步才是shell最重要的内容。试着在你的标准shell中输入ls,你就会发现它列出了文件夹下的所有文件与文件夹名称。输入ls -l就会附带文件的读写权限。如果你的当前文件夹下有一个叫做abc的程序，输入./abc，shell就会执行它。
<p>这一步，关键的函数是exec*家族。关于他们的使用与区别，我建议大家看stackoverflow上的一个问题：<a href="http://stackoverflow.com/questions/5769734/what-are-the-different-versions-of-exec-used-for-in-c">What are the different versions of exec used for in C++?</a></p>
这个家族的函数都是用来在程序中执行其他进程的，在执行成功后，不会返回当前程序，而是直接结束。因此为了不使我们的shell只执行一次就自动结束，我们需要创建一个新的进程给这个程序调用。这里涉及到了fork()的有关知识。
<p>fork()的作用是创建一个新的子进程,而它的返回是孩子进程的pid（pid是用来识别某一个进程的标志），如果返回0，则当前的代码正在子进程中运行，返回不为0，则在父进程，并且返回值为所创建的子进程的pid。</p>
<p>是不是晕晕的？没关系，大家可以写一个小demo:</p>
<pre style='color:#000000;background:#f1f0f0;'><span style='color:#400000; font-weight:bold; '>int</span> <span style='color:#800000; font-weight:bold; '>main</span><span style='color:#806030; '>(</span><span style='color:#806030; '>)</span><span style='color:#806030; '>{</span>
    <span style='color:#400000; font-weight:bold; '>int</span> result<span style='color:#806030; '>;</span>
    <span style='color:#800040; '>printf</span><span style='color:#806030; '>(</span><span style='color:#800000; '>"</span><span style='color:#e60000; '>before fork ...</span><span style='color:#0f6900; '>\n</span><span style='color:#800000; '>"</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
    result <span style='color:#806030; '>=</span> fork<span style='color:#806030; '>(</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
    <span style='color:#800040; '>printf</span><span style='color:#806030; '>(</span><span style='color:#800000; '>"</span><span style='color:#e60000; '>result = </span><span style='color:#007997; '>%d</span><span style='color:#e60000; '>.</span><span style='color:#0f6900; '>\n</span><span style='color:#800000; '>"</span><span style='color:#806030; '>,</span>result<span style='color:#806030; '>)</span><span style='color:#806030; '>;</span><span style='color:#400000; font-weight:bold; '>if</span> <span style='color:#806030; '>(</span>result <span style='color:#806030; '>=</span><span style='color:#806030; '>=</span> <span style='color:#c00000; '>0</span><span style='color:#806030; '>)</span><span style='color:#806030; '>{</span>
        <span style='color:#800040; '>printf</span><span style='color:#806030; '>(</span><span style='color:#800000; '>"</span><span style='color:#e60000; '>I'm child process.</span><span style='color:#0f6900; '>\n</span><span style='color:#800000; '>"</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
        <span style='color:#800040; '>printf</span><span style='color:#806030; '>(</span><span style='color:#800000; '>"</span><span style='color:#e60000; '>My PID is </span><span style='color:#007997; '>%d</span><span style='color:#0f6900; '>\n</span><span style='color:#800000; '>"</span><span style='color:#806030; '>,</span> getpid<span style='color:#806030; '>(</span><span style='color:#806030; '>)</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
    <span style='color:#806030; '>}</span>
    <span style='color:#400000; font-weight:bold; '>else</span><span style='color:#806030; '>{</span>
        <span style='color:#800040; '>printf</span><span style='color:#806030; '>(</span><span style='color:#800000; '>"</span><span style='color:#e60000; '>I'm parent process.</span><span style='color:#0f6900; '>\n</span><span style='color:#800000; '>"</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
        <span style='color:#800040; '>printf</span><span style='color:#806030; '>(</span><span style='color:#800000; '>"</span><span style='color:#e60000; '>My PID is </span><span style='color:#007997; '>%d</span><span style='color:#0f6900; '>\n</span><span style='color:#800000; '>"</span><span style='color:#806030; '>,</span> getpid<span style='color:#806030; '>(</span><span style='color:#806030; '>)</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
    <span style='color:#806030; '>}</span>
    <span style='color:#800040; '>printf</span><span style='color:#806030; '>(</span><span style='color:#800000; '>"</span><span style='color:#e60000; '>terminated.</span><span style='color:#0f6900; '>\n</span><span style='color:#800000; '>"</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
<span style='color:#806030; '>}</span>
</pre>
运行一下，可能每一次结果都不同。有时会看到child process 先出现，有时会parent process。如果有这种情况，也是正常，因为在fork之后，系统会从父进程中新建出一个子进程，同时复制父进程的所有变量、文件描述符、堆栈情况，不过如果子进程不对变量进行修改，这些东西都会指向同一块内存（写时复制）。而在此之后，两个进程由操作系统来调度，因此谁先执行并不能确定。</p>
<p>到了这里，思路就应该明朗了：fork一个进程，然后加以判断，如果是子进程，就执行exce\*家族的函数，完毕后子进程就会自动退出。</p>
<p>这里要注意的是，子进程在执行完毕后，会被系统回收，但不会被消灭，进入所谓的僵尸进程状态。只有父进程在调用了waitpid(childpid)后，才会对孩子进行回收。不然就变成了孤儿：）</p>
<p>因此在调用后，我们还需要在后面添加一个waitpid()函数。这个语句还有一个作用，即父进程要等待子进程进行完毕才进行这句话之后的操作。</p>
最后一点，当我们在系统shell输入ls或者chmod的时候，这些可执行文件的路径其实并不在当前文件夹下，对么？所以在这里shell还偷偷查找了一下这些命令的位置。而这些预先查找的路径，叫做系统的环境变量。对于\*nix系统,一般都保存在~/.bashrc的文件中（windows可以在我的电脑属性中进行设置）。因此在我们的shell中，需要预处理添加环境变量，例如/bin,/usr/bin。当然，最后也要搜索./，也就是当前目录（对，这些搜索路径是有先后顺序的，而一旦先找到了某个目录下的文件，就会停止搜索）。
<p>当然，如果你想偷懒，也可以用exec\*家族的函数，例如execle，可以把环境变量作为char\*传入到最后一个参数中去。</p>
我的，拙劣的程序片段。。。
<pre style='color:#000000;background:#f1f0f0;'><span style='color:#c34e00; '>//execute programme</span>
    <span style='color:#c34e00; '>//file with path</span>
    <span style='color:#400000; font-weight:bold; '>if</span> <span style='color:#806030; '>(</span><span style='color:#800000; font-weight:bold; '>arg</span><span style='color:#806030; '>[</span><span style='color:#c00000; '>0</span><span style='color:#806030; '>]</span><span style='color:#806030; '>[</span><span style='color:#c00000; '>0</span><span style='color:#806030; '>]</span> <span style='color:#806030; '>=</span><span style='color:#806030; '>=</span> <span style='color:#008000; '>'.'</span> <span style='color:#806030; '>|</span><span style='color:#806030; '>|</span> <span style='color:#800000; font-weight:bold; '>arg</span><span style='color:#806030; '>[</span><span style='color:#c00000; '>0</span><span style='color:#806030; '>]</span><span style='color:#806030; '>[</span><span style='color:#c00000; '>0</span><span style='color:#806030; '>]</span> <span style='color:#806030; '>=</span><span style='color:#806030; '>=</span> <span style='color:#008000; '>'/'</span><span style='color:#806030; '>)</span><span style='color:#806030; '>{</span>
        <span style='color:#400000; font-weight:bold; '>int</span> ind <span style='color:#806030; '>=</span> fork<span style='color:#806030; '>(</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
        <span style='color:#400000; font-weight:bold; '>if</span> <span style='color:#806030; '>(</span>ind <span style='color:#806030; '>=</span><span style='color:#806030; '>=</span> <span style='color:#c00000; '>0</span><span style='color:#806030; '>)</span><span style='color:#806030; '>{</span>
            execv<span style='color:#806030; '>(</span><span style='color:#800000; font-weight:bold; '>arg</span><span style='color:#806030; '>[</span><span style='color:#c00000; '>0</span><span style='color:#806030; '>]</span><span style='color:#806030; '>,</span> <span style='color:#800000; font-weight:bold; '>arg</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
            <span style='color:#400000; font-weight:bold; '>if</span> <span style='color:#806030; '>(</span>errno <span style='color:#806030; '>=</span><span style='color:#806030; '>=</span> <span style='color:#007d45; '>ENOTDIR</span> <span style='color:#806030; '>|</span><span style='color:#806030; '>|</span> errno <span style='color:#806030; '>=</span><span style='color:#806030; '>=</span> <span style='color:#007d45; '>ENOENT</span><span style='color:#806030; '>)</span> <span style='color:#800040; '>printf</span><span style='color:#806030; '>(</span><span style='color:#800000; '>"</span><span style='color:#007997; '>%s</span><span style='color:#e60000; '>: directory or file not found</span><span style='color:#0f6900; '>\n</span><span style='color:#800000; '>"</span><span style='color:#806030; '>,</span> input<span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
            <span style='color:#400000; font-weight:bold; '>else</span> <span style='color:#800040; '>fprintf</span><span style='color:#806030; '>(</span><span style='color:#800040; '>stderr</span><span style='color:#806030; '>,</span> <span style='color:#800000; '>"</span><span style='color:#007997; '>%s</span><span style='color:#e60000; '>: unknown error</span><span style='color:#0f6900; '>\n</span><span style='color:#800000; '>"</span><span style='color:#806030; '>,</span> input<span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
            <span style='color:#800040; '>exit</span><span style='color:#806030; '>(</span><span style='color:#c00000; '>0</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
        <span style='color:#806030; '>}</span>
        <span style='color:#400000; font-weight:bold; '>else</span> waitpid<span style='color:#806030; '>(</span>ind<span style='color:#806030; '>,</span> <span style='color:#007d45; '>NULL</span><span style='color:#806030; '>,</span> <span style='color:#c00000; '>0</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
    <span style='color:#806030; '>}</span> <span style='color:#400000; font-weight:bold; '>else</span> <span style='color:#806030; '>{</span>
        <span style='color:#400000; font-weight:bold; '>int</span> ind <span style='color:#806030; '>=</span> fork<span style='color:#806030; '>(</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
        <span style='color:#400000; font-weight:bold; '>if</span> <span style='color:#806030; '>(</span>ind <span style='color:#806030; '>=</span><span style='color:#806030; '>=</span> <span style='color:#c00000; '>0</span><span style='color:#806030; '>)</span><span style='color:#806030; '>{</span>
            <span style='color:#400000; font-weight:bold; '>char</span> tmp<span style='color:#806030; '>[</span><span style='color:#c00000; '>255</span><span style='color:#806030; '>]</span> <span style='color:#806030; '>=</span> <span style='color:#806030; '>{</span><span style='color:#c00000; '>0</span><span style='color:#806030; '>}</span><span style='color:#806030; '>;</span>
            <span style='color:#c34e00; '>//first, search /bin</span>
            <span style='color:#800040; '>strcat</span><span style='color:#806030; '>(</span>tmp<span style='color:#806030; '>,</span> <span style='color:#800000; '>"</span><span style='color:#e60000; '>/bin/</span><span style='color:#800000; '>"</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
            <span style='color:#800040; '>strcat</span><span style='color:#806030; '>(</span>tmp<span style='color:#806030; '>,</span> <span style='color:#800000; font-weight:bold; '>arg</span><span style='color:#806030; '>[</span><span style='color:#c00000; '>0</span><span style='color:#806030; '>]</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
            execv<span style='color:#806030; '>(</span>tmp<span style='color:#806030; '>,</span> <span style='color:#800000; font-weight:bold; '>arg</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
            <span style='color:#c34e00; '>//not found! search /usr/bni</span>
            tmp<span style='color:#806030; '>[</span><span style='color:#c00000; '>0</span><span style='color:#806030; '>]</span> <span style='color:#806030; '>=</span> <span style='color:#c00000; '>0</span><span style='color:#806030; '>;</span>
            <span style='color:#800040; '>strcat</span><span style='color:#806030; '>(</span>tmp<span style='color:#806030; '>,</span> <span style='color:#800000; '>"</span><span style='color:#e60000; '>/usr/bin/</span><span style='color:#800000; '>"</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
            <span style='color:#800040; '>strcat</span><span style='color:#806030; '>(</span>tmp<span style='color:#806030; '>,</span> <span style='color:#800000; font-weight:bold; '>arg</span><span style='color:#806030; '>[</span><span style='color:#c00000; '>0</span><span style='color:#806030; '>]</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
            execv<span style='color:#806030; '>(</span>tmp<span style='color:#806030; '>,</span> <span style='color:#800000; font-weight:bold; '>arg</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
            <span style='color:#c34e00; '>//no file either, search the current dir</span>
            tmp<span style='color:#806030; '>[</span><span style='color:#c00000; '>0</span><span style='color:#806030; '>]</span> <span style='color:#806030; '>=</span> <span style='color:#c00000; '>0</span><span style='color:#806030; '>;</span>
            <span style='color:#800040; '>strcat</span><span style='color:#806030; '>(</span>tmp<span style='color:#806030; '>,</span> <span style='color:#800000; '>"</span><span style='color:#e60000; '>./</span><span style='color:#800000; '>"</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
            <span style='color:#800040; '>strcat</span><span style='color:#806030; '>(</span>tmp<span style='color:#806030; '>,</span> <span style='color:#800000; font-weight:bold; '>arg</span><span style='color:#806030; '>[</span><span style='color:#c00000; '>0</span><span style='color:#806030; '>]</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
            execv<span style='color:#806030; '>(</span>tmp<span style='color:#806030; '>,</span> <span style='color:#800000; font-weight:bold; '>arg</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
            <span style='color:#400000; font-weight:bold; '>if</span> <span style='color:#806030; '>(</span>errno <span style='color:#806030; '>=</span><span style='color:#806030; '>=</span> <span style='color:#007d45; '>ENOTDIR</span> <span style='color:#806030; '>|</span><span style='color:#806030; '>|</span> errno <span style='color:#806030; '>=</span><span style='color:#806030; '>=</span> <span style='color:#007d45; '>ENOENT</span><span style='color:#806030; '>)</span> <span style='color:#800040; '>fprintf</span><span style='color:#806030; '>(</span><span style='color:#800040; '>stderr</span><span style='color:#806030; '>,</span> <span style='color:#800000; '>"</span><span style='color:#007997; '>%s</span><span style='color:#e60000; '>: directory or file not found</span><span style='color:#0f6900; '>\n</span><span style='color:#800000; '>"</span><span style='color:#806030; '>,</span> input<span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
            <span style='color:#400000; font-weight:bold; '>else</span> <span style='color:#800040; '>fprintf</span><span style='color:#806030; '>(</span><span style='color:#800040; '>stderr</span><span style='color:#806030; '>,</span> <span style='color:#800000; '>"</span><span style='color:#007997; '>%s</span><span style='color:#e60000; '>: unknown error</span><span style='color:#0f6900; '>\n</span><span style='color:#800000; '>"</span><span style='color:#806030; '>,</span> input<span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
            <span style='color:#800040; '>exit</span><span style='color:#806030; '>(</span><span style='color:#c00000; '>0</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
        <span style='color:#806030; '>}</span>
        <span style='color:#400000; font-weight:bold; '>else</span> waitpid<span style='color:#806030; '>(</span>ind<span style='color:#806030; '>,</span> <span style='color:#007d45; '>NULL</span><span style='color:#806030; '>,</span> <span style='color:#c00000; '>0</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
    <span style='color:#806030; '>}</span>
</pre>
没有用到execle。。。完全是纯手写


<h3 id="a4">shell第四步：信号处理</h3>
signal是操作系统的一个重要部分。编程的时候，我们处处与信号打交道（也许你不知道）：写一个等待输入的程序，当键盘按下的时候，就会向系统发送信号。
<p>当然，这里我们说的信号更为特殊一点，你可以在<a href="https://en.wikipedia.org/wiki/Unix_signal">维基</a>看到所有的unix系统信号。当我们在控制台中输入Ctrl+C的时候，就是发送了一个SIGINT中断信号，如果有当前运行的程序，就会被中断退出。但你在系统shell中按这个组合键，在不运行任何程序的情况下，shell是不会自行关闭的，也就是说，它忽略了这个信号。你也可以输入exit，看一下结果的不同。</p>
因此我们需要像系统shell那样，对这些信号进行处理，让它们不能“杀死”我们的shell程序。这里就用到了signal()函数，或者他的安全版本，sigaction()。这二者的用法可以参考它们的说明文档。在这里，我们选择对SIGINT,SIGQUIT,SITTER以及SIGTSTP进行处理，构建一个函数sighandler，对这些信号忽略:
<pre style='color:#000000;background:#f1f0f0;'><span style='color:#400000; font-weight:bold; '>static</span> <span style='color:#400000; font-weight:bold; '>void</span> sighandler<span style='color:#806030; '>(</span><span style='color:#400000; font-weight:bold; '>int</span> signum<span style='color:#806030; '>)</span>
<span style='color:#806030; '>{</span>
    <span style='color:#800040; '>printf</span><span style='color:#806030; '>(</span><span style='color:#800000; '>"</span><span style='color:#0f6900; '>\n</span><span style='color:#800000; '>"</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
<span style='color:#806030; '>}</span>

<span style='color:#400000; font-weight:bold; '>int</span> <span style='color:#800000; font-weight:bold; '>main</span><span style='color:#806030; '>(</span><span style='color:#806030; '>)</span><span style='color:#806030; '>{</span>
    <span style='color:#400000; font-weight:bold; '>struct</span> sigaction sa<span style='color:#806030; '>;</span>
    sa<span style='color:#806030; '>.</span>sa_handler <span style='color:#806030; '>=</span> handler<span style='color:#806030; '>;</span>
    sigemptyset<span style='color:#806030; '>(</span><span style='color:#806030; '>&amp;</span>sa<span style='color:#806030; '>.</span>sa_mask<span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
    sigaction<span style='color:#806030; '>(</span>SIGINT<span style='color:#806030; '>,</span> <span style='color:#806030; '>&amp;</span>sa<span style='color:#806030; '>,</span> <span style='color:#007d45; '>NULL</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
    sigaction<span style='color:#806030; '>(</span>SIGQUIT<span style='color:#806030; '>,</span> <span style='color:#806030; '>&amp;</span>sa<span style='color:#806030; '>,</span> <span style='color:#007d45; '>NULL</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
    sigaction<span style='color:#806030; '>(</span>SIGTERM<span style='color:#806030; '>,</span> <span style='color:#806030; '>&amp;</span>sa<span style='color:#806030; '>,</span> <span style='color:#007d45; '>NULL</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
    sigaction<span style='color:#806030; '>(</span>SIGTSTP<span style='color:#806030; '>,</span> <span style='color:#806030; '>&amp;</span>sa<span style='color:#806030; '>,</span> <span style='color:#007d45; '>NULL</span><span style='color:#806030; '>)</span><span style='color:#806030; '>;</span>
<span style='color:#c34e00; '>/* ... */</span>
<span style='color:#806030; '>}</span>
</pre>
这样一来，再次运行的shell就不会被这些信号所打断。需要提醒的是，虽然父进程不会，但这些信号还是会被子进程捕获，所以在用我们的shell运行子进程的时候，那些组合键依然对他们有效。

<h3 id="a5">shell第五步：pipeline管道</h3>
<p>这是整个任务中最难理解的环节。准备好哦！</p>
<p>首先我们搞清楚pipline(管道)是个什么概念。它在shell中以`|`符号表示。与重定向符号`< >`不同（它与重定向的工作原理也不同，具体可以参考<a href="https://en.wikipedia.org/wiki/Redirection_(computing)">wikipedia</a>或者<a href="http://www.ugrad.cs.ubc.ca/~cs219/CourseNotes/Unix/shell-redirect.html">redirection&pipline</a>， 里面有一个例子很生动：
<pre style='color:#000000;background:#f1f0f0;'>For instance, typing<span style='color:#806030; '>:</span>

command1 <span style='color:#e34adc; '>|</span> command2
causes the standard output of command1 to <span style='color:#e60000; '>"flow through"</span> to the standard input of command2<span style='color:#400000; font-weight:bold; '>.</span> This is the same as typing<span style='color:#806030; '>:</span>

% command1 <span style='color:#e34adc; '>></span> <span style='color:#40015a; '>/tmp/aTemporaryFile</span> 
% command2 <span style='color:#e34adc; '>&lt;</span> <span style='color:#40015a; '>/tmp/aTemporaryFile</span> 
% rm <span style='color:#40015a; '>/tmp/aTemporaryFile</span>
</pre>）。
<p>那么管道是什么呢？它相当于在不同进程中建立了一个IO的桥梁。我们举例来说，在shell中输入<code>ls | grep a</code>就会把所有包含a的文件名打印出来。这里，ls的输出本应该是到控制台（标准输出），但是却被管道重新导向了grep进程，从而变成了grep的输入，grep再从输入中找到带有a的项，进行输出。这就像用一个水管，把A流出的水引流到了B中。管道可以连续运用，例如再把B的输出引流向C，以此类推，最后形成一个绵长的水管结构：）</p>
<p>你也许会觉得比较简单，先把a运行，然后把输出储存起来再运行b，以此类推。不过这里，shell的管道实现是并行的，也就是说，所有的进程是同时运行的。这里你也许会有疑问，如果后者运行依赖于前者输出，那么并行的话岂不是可能会造成后面比前面快从而等不到前面的输出，或者前面的输出过于迅速，后面输入根本来不及处理的情况吗？就像水管被装满水，没法进入更多的水流一样。这个问题问得很好，答案是，操作系统会有一套机制对这类竞争问题进行解决，当发现任意一方过快时，就会让它停下等待，合适的时候继续运作。</p>
<p>不过幸运的是，这些工作不需要我们来调度，因为linux提供了一个函数：``pipe()``,用来创建管道。依然推荐大家看相关说明。输入是一个大小为2的int数组，它会创造两个文件描述符，例如传入mypipe[2],那么mypipe[0]就是读文件的描述符，mypipe[1]就是写文件的描述符。在创建好描述符之后，我们就可以用管道进行通讯了。具体做法是，fork出一个子进程，两个进程之间进行输入输出。输入的一方要把输出端描述符关闭，只打开输入端，接收输入端的一方需要把输出端的描述符关闭，只打开输出端。由于二者是在两个进程内对端口进行开关，因此不会相互影响。这就好比要往管道里倒水，就需要把另一个口堵住；或者从水管里倒出水来，也需要把另一个口堵住，不然会两头出水，发生异常。</p>
<p>很好的例子：<br><a href="http://www.tldp.org/LDP/lpg/node11.html"> Creating Pipes in C</a><br><a href="http://man7.org/linux/man-pages/man2/pipe.2.html">PIPE(2) MAN</a>

<p>所以这里我们明白了，pipe()就是把输入输出连接了起来，然后通过描述符来识别不同的端口。那么，如果我们想要实现更多的管道，应该怎么做呢？而且，在执行程序的时候，我们仅仅运行那个程序，而非修改它的代码，所以它不会知道输入的描述符在那个地方。程序运行都是标准输入输出，这又怎么办呢？</p>
<p>这里我们又要提供一个函数:``dup()``，或者它的升级版``dup2()``。这两个函数十分有用，我们单单拿好用一些的``dup2()``来说，它接受两个参数，``(old_descriptor, new_descriptor)``，作用是把前者的文件描述符复制到后者去。举例来说，如果前者描述符是一个管道的输出端，后者是另一个管道的输出端，那么如果用了dup操作，那么该进程中凡是从后者输出的代码，都会输出到前者的管道中去。</p>
<p>更生动一点的例子，如果我们dup2(mypipe[0],stdin),那么凡是从stdin读入的操作，都会转为从mypipe[0]端口进行读入。也就是说，所有的scanf()，cin>>接受的数据都变成了从mypipe[0]传来的数据。</p>
<p>这样一来，思路就清晰了：我们只需要把每个子进程的标准输入输出端口用管道的端口覆盖掉，只留第一个和最后一个的标准输入与输出，就可以实现把所有进程串联起来的效果。</p>
<p>这里我就不贴代码了，因为有两个很好的例子，大家可以去这里和这里看一看他们的实现。</p>
<p>所以，我们只需要用strtok()把所有用 `|`分隔开的命令一一放到子进程中去执行，同时修改描述符，就可以实现pipeline的效果！是不是很酷！</p>
<p>尝试运行你的shell，执行一些常用操作，你会发现，除了补全功能，他真的更像一个shell了；）</p>

<h3 id="a6">shell番外步：让你的shell更像shell</h3>
<p>啊哈！现在你已经实现了一个简单的shell，但是总觉得缺点了什么。没错，就是包装！作为热爱艺术的我，如此单调的界面怎么可以？</p>
<p>我们注意到，正常的shell通常会在命令之前显示你的主机账户名，shell所处的当前目录，有的还有一些特殊符号，例如``$``。那么我们也来实现一下吧！</p>
<ul>获得当前用户名：利用unistd.h中的函数：``int getlogin_r(char *buf, size_t bufsize);``</ul>
<ul>获得当前shell所处路径名：利用函数``getcwd()``</ul>
<ul>彩蛋!让你的shell多姿多彩：我看到标准的shell有颜色！我也想有！怎么弄！<p>不急不急，试试输入``printf("\x1B[33m我是黄色")``~</p>
<p>这里是一些颜色的编码：
<ul>#define KNRM  "\x1B[0m"</ul>
<ul>#define KRED  "\x1B[31m"</ul>
<ul>#define KGRN  "\x1B[32m"</ul>
<ul>#define KYEL  "\x1B[33m"</ul>
<ul>#define KBLU  "\x1B[34m"</ul>
<ul>#define KMAG  "\x1B[35m"</ul>
<ul>#define KCYN  "\x1B[36m"</ul>
<ul>#define KWHT  "\x1B[37m"</ul></p>
</ul>
<br>
<p>好了，现在你已经完整地实现了一个酷炫的shell，给他起个名字吧，然后再向朋友们炫耀一番！</p>