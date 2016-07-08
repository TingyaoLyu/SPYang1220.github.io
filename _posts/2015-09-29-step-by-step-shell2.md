---
layout: post
date: 2015-09-29
title: 一步一步来，写一个简易shell（进阶篇）
category: posts
tags: programming, operating system
---

一步一步来，如何写一个简易shell（进阶篇）
<p>为了高标准完成作业，我按照原BSD版本的shell实现了工作管理，即job control。而这一项任务，实在是值得另开一篇文章。</p>
<h3>什么是Job Control</h3>
<p>打开你的shell，然后输入cat，回车，你会看到光标在等待你的键盘输入。随便输点什么，回车，他会原样输出。cat是一个输出程序，将输入给它的字节流原封不动流到标准输出。现在我们如何结束它？你可以按下Ctrl-C，它会收到上篇我们讲到的SIGINT信号，然后终止。但如果你按下Ctrl-Z，你会发现shell会出现一个提示：</p>
<div style="background: #f0f0f0; overflow:auto;width:auto;border:solid gray;border-width:.1em .1em .1em .8em;padding:.2em .6em;"><pre style="margin: 0; line-height: 125%">Job 1, <span style="color: #4070a0">&#39;cat&#39;</span> has stopped
</pre></div><br>
<p>接着输入``jobs``，就会输出刚刚被你停止的那个cat进程，包括他的Group id、目前状态(Stropped)。此时如果输入``fg``或者``fg 1(假设cat的job 编号是 1的话)``，就会发现cat又从后台停止回到了前台运行状态。这里有个小细节要注意，如果你用的是mac，cat会提示stdin被interrupt，从而终止程序；如果你用的是linux，则不会有这种现象，cat会继续运行。这是mac在实现唤醒操作后会额外发送一个信号打断该程序的标准输入，而如果该程序对此没有处理函数，默认的行为是STOP暂停（对于cat而言则是终止）。这部分有些复杂，看完之后的内容你就会了解。</p>
<p>看到这里，你大概明白了C-c与C-z的不同：一个是发送中断信号，而另一个则是发送暂停信号。暂停后的进程会被放入后台休息，然后通过fg唤醒某一个后台程序。</p>
<p>所以，我们要实现的也是这样一个功能：后台与前台的调度。虽说只有一个功能，可背后包含的逻辑，想要搞懂还是很麻烦的。</p>

<h3>一个简单的想法</h3>
<p>其实后台功能的实现，之前那个简易shell已经可以做到，尝试在你的shell中输入cat然后Ctrl-Z，这时你可以再次输入命令，cat已经进入了后台。因为你的shell程序忽略了Ctrl-Z的信号SIGTSTP，但是cat命令没有。</p>
<p>但我们不能把它拉回前台，也不能列出所有的后台程序。如果想要实现记录后台程序的功能，就需要添加一个数据结构（例如链表），存放所有运行程序的pid，并且再标志一个前台程序的pid。如果没有活动程序，就把pid设为0。当接收到jobs命令，就把所有的后台程序输出，收到fg，就把后台程序唤醒（唤醒也是发送一个信号，SIGCONT），唤醒程序，需要用到``kill（pid，signal）``函数。</p>
<p>似乎整个实现就是这样。不过如果挖掘一下，你会发现一个很奇怪的“bug”：当把程序放进后台，然后按下Ctrl-C的时候，再把后台程序调出来，你会发现他们都不见了（终止了）！也就是说，后台暂停的程序竟然也收到了键盘发送的信号。而这在正常情况下是错误的，因为后台无法获得与输入输出设备交互的权限。</p>

<h3>Process Group</h3>
<p>为了解决这个问题，我们需要去看一下标准linux的实现。这里我依然推荐去GNU的网站看job control的章节，虽然有点长，而且它的实现方法更加底层。另外，更加简洁的版本在这里<a href="https://www.win.tue.nl/~aeb/linux/lk/lk-10.html">PROCESS</a>。</p>
<p>真正的实现是，每次shell创建了一个进程后，他都会给这个进程分配到另一个进程组中，然后把这个进程组设为前台程序，自己则退到后台等待程序停止或退出。什么是进程组(Process Group)呢？它是有联系的进程的集合。当父进程fork()出子进程时，子进程自动被分配到父进程所在的组。而不同的程序则在不同的进程组中运行。一个进程组会共享信号，也就是说，如果我在shell中按下Ctrl-C，那么它的所有子进程也都会收到这个信号。这就不难解释为什么后台的程序会无缘无故退出的缘故。</p>
<p>不过，子进程既然自动继承了父进程的组，如何把它放在新的组中？这里我们需要用到``setpgid(pid,pgid)``函数。它把pid对应的进程放到pgid对应的进程组中，如果pgid不存在，则新建一个相应的进程组。如何管理一个进程组？如果输入单一命令，那么它就自成一组；如果输入了一个pipe语句，那么这条pipe中的所有命令都在一个组中。</p>
<P>一个Process Group（以下简称pg）会有一个组长进程，也就是pg中的第一个进程（组长进程pid与pg的pgid相同）。因此我们在创建进程组的时候，需要看一看是否已经有当前活跃的pgid，如果有，则把子进程加入到对应pgid中，否则创建一个新的pg，它的pgid是当前子进程的pid。</P>
这样，我们就得到以下代码：
<!-- HTML generated using hilite.me -->
<div style="background: #f8f8f8; overflow:auto;width:auto;border:solid gray;border-width:.1em .1em .1em .8em;padding:.2em .6em;"><pre style="margin: 0; line-height: 125%"><span style="color: #000000">p</span> <span style="color: #ce5c00; font-weight: bold">=</span> <span style="color: #000000">fork</span><span style="color: #000000; font-weight: bold">();</span>
<span style="color: #204a87; font-weight: bold">if</span> <span style="color: #000000; font-weight: bold">(</span><span style="color: #000000">p</span> <span style="color: #ce5c00; font-weight: bold">==</span> <span style="color: #000000; font-weight: bold">(</span><span style="color: #204a87; font-weight: bold">pid_t</span><span style="color: #000000; font-weight: bold">)</span> <span style="color: #ce5c00; font-weight: bold">-</span><span style="color: #0000cf; font-weight: bold">1</span><span style="color: #000000; font-weight: bold">)</span> <span style="color: #000000; font-weight: bold">{</span>
        <span style="color: #8f5902; font-style: italic">/* ERROR */</span>
<span style="color: #000000; font-weight: bold">}</span> <span style="color: #204a87; font-weight: bold">else</span> <span style="color: #204a87; font-weight: bold">if</span> <span style="color: #000000; font-weight: bold">(</span><span style="color: #000000">p</span> <span style="color: #ce5c00; font-weight: bold">==</span> <span style="color: #0000cf; font-weight: bold">0</span><span style="color: #000000; font-weight: bold">)</span> <span style="color: #000000; font-weight: bold">{</span>    <span style="color: #8f5902; font-style: italic">/* CHILD */</span>
        <span style="color: #000000">setpgid</span><span style="color: #000000; font-weight: bold">(</span><span style="color: #0000cf; font-weight: bold">0</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">pgid</span><span style="color: #000000; font-weight: bold">);</span>
        <span style="color: #000000; font-weight: bold">...</span>
<span style="color: #000000; font-weight: bold">}</span> <span style="color: #204a87; font-weight: bold">else</span> <span style="color: #000000; font-weight: bold">{</span>                <span style="color: #8f5902; font-style: italic">/* PARENT */</span>
        <span style="color: #000000">setpgid</span><span style="color: #000000; font-weight: bold">(</span><span style="color: #000000">p</span><span style="color: #000000; font-weight: bold">,</span> <span style="color: #000000">pgid</span><span style="color: #000000; font-weight: bold">);</span>
        <span style="color: #000000; font-weight: bold">...</span>
<span style="color: #000000; font-weight: bold">}</span>
</pre></div>
为什么父子都要执行一次setpgid呢？因为我们无法断定二者运行的先后顺序，所以为了防止Race Condition的发生，我们在两个进程中都执行一次相同的操作。
<p>对于pipe，只需要检查当前active_pgid是否为0，如果是，那就新建一个进程组(setpgid(pid,pid)),否则就加到active_pgid的组里去(setpgid(pid,active_pgid))。</p>
<p>这样一来，进程组分配完毕了。那么如何把这一组调度到前台呢？</p>

<h3>工作调度以及后台信号处理</h3>
<p>来认识一个新朋友：tcsetpgrp(FILE, pgid)。这个函数的作用是让pgid对应的进程组接管FILE对应的文件操作符。也就是说，如果我把标准输入输出作为第一个参数，那么对应pgid就会直接和命令行进行交互，也就变成了所谓的“前台”程序。</p>
<p>由于每次新建进程，都要把它作为前台，因此在fork后，我们就需要执行操作：tcsetpgrp(STDIN_FILENO, childpid) 注意，这句话要写在parent进程中，因为只有前台程序有权利运行此句，不然会受到系统发来的非法信号（关于这个信号，我们一会儿再说）。这样一来，我们就把前台权利让给了子进程。</p>
<p>但是如何阻塞直到子进程结束或者暂停呢？你肯定会说，waitpid。没错，这个函数不仅可以等待某一个进程的状态变化，也可以等待某一个进程组的状态变化，只需要把第一个参数变为负数-pgid就可以了。如果想不仅仅等待子进程结束，还等待子进程暂停运行的信号，我们需要在第三个参数加上WUNTRACED宏，表示还要等待对应进程组暂停的信号。这样，对当前运行的程序按下Ctrl-Z，就又可以回到shell的输入界面。</p>
<p>不过waitpid有一个缺陷，就是捕捉到子进程状态变化后，不能判断它是被终止了还是被暂停了。所以这里我们用一个新的函数：waitid()。它接受一个指示状态的结构体siginfo_t作为参数，在接收到子进程状态变化的信号后，透过结构体中的变量值我们可以判断子进程究竟是发生了什么变化。具体你可以在linux的man page上找到详细说明。</p>
<p>对于暂停的子进程组，我们不能把它从链表中删去，而是保存起来。对于结束的子进程组，我们把它从链表中删去。如果用户指定让某个后台程序恢复前台，我们只需要在链表中找到对应的进程组，给他们标准输入输出的接口（tcsetpgrp()),然后向他们发送一个SIGCONT信号（向一个进程组发送信号，可以用killpg(pgid, signal))。</p>
<p>到了这里，思路就应该比较清晰了。动手写代码后发现，有很多奇特的问题。</p>
<p>比如当子进程收到Ctrl-Z后，父进程shell也会停止运行进入后台。这让我觉得很奇怪，因为上一篇中我已经让shell对SIGTSTP进行了无操作处理。</p>
<p>经过一下午的调试，我搞清楚了原因:在waitpid之后，我们会再次设置shell为前台进程，这里会执行tcsetpgrp()语句把输入输出权限移给自己，但是此时shell还并不是前台进程（注意，它只是等到了子进程退出或停止，但是输入输出权限还未转移），所以此时设置tcsetpgrp()会受到系统的信号SIGTTIN,SIGTTOU,这两个信号都是当后台程序试图与标准输入输出进行交互的时候自动触发的，接收到的默认操作是停止运行。这也就是为什么我们的shell进程也会自动停止的原因。</p>
<p>所以我们需要把这两个信号在主进程进行忽略。用``signal(SIGTTIN, SIG_IGN)``,``signal(SIGTTOU, SIG_IGN)``两句。</p>

<h3>收尾工作</h3>
<p>我们会发现，如果在系统的shell中运行了后台进程的话，当我们输入exit的时候，shell会提示我们有后台进程进行，无法退出。这意味着，如果我们仅仅强制退出shell，那么对于所有的后台进程，就缺失了调度他们的主进程，于是他们就成为了孤儿进程(Orphan process)。只能通过kill相应的pid进行退出。</p>
<p>所以我们需要添加一个收尾的工作，以防止遗留任何孤儿进程的存在。</p>
<p>首先，当我们waitid接受到子进程退出的信号时，为了以防万一，需要给这个进程组发一个强制退出的命令，防止有个别子进程依然在后台停止:killpg(pid, 9)（9的意思是SIGKILL，强制退出，这个信号不能被忽略）。其次，在我们的shell接受到exit命令时，要加以判断，如果当前进程链表中还存在后台进程，就需要给出提示，如果用户强制退出，就把所有子进程kill掉，然后自己exit。</p>

<h5>如此一来，一个带有工作调度的shell就完成了。这一次的实现可真是硬核，希望读者能够从中学到一些真正有用的知识，从而加深对操作系统的理解。</h5>

