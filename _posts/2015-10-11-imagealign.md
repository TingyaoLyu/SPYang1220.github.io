---
layout: post
date: 2015-10-11 14:03:14
title: Computer Photography：Image Alignment
category: [posts]
comments: true
tags: [programming, computer vision]
---
<p>一周过去了，忙忙碌碌做了不少事，现在又到安心写博客的时间啦~</p>
<p>恩，继续写写我的作业。这次是计算机视觉领域的课程，作业具体内容是，给你三张RGB通道的图片，把它们合成为一张彩色图片。</p>
<p>如果仅仅是同一张图的三个通道，这个任务就简单多了。但这三张图是有一些差别的，而且它们的来头不小。这次作业的数据集来自著名的俄国摄影家<a href="https://en.wikipedia.org/wiki/Sergey_Prokudin-Gorsky" target="_blank">Sergei Mikhailovich Prokudin-Gorskii</a>(1863-1944)（抱歉这字我读不顺）。关于他的事迹，你可以到wiki上详细查看。简单讲，就是在那个没有彩色相机的时代，他发明了一种能捕捉彩色图像的方法：用三种不同颜色的滤镜（红绿蓝）罩住黑白相机的镜头，然后拍下三种照片，之后把三个照片叠加在一起，透过光就可以看到彩色图片。真是很天才的想法。因为三张图片并非完全相同，所以它们之间会有细微的位移、旋转、缩放等差别。</p>
<p>因此，我们的任务是：找到每个通道图片相互最佳匹配的位置，然后在对应位置把他们叠加起来。呈现出最好的效果。</p>

<p>为了给大家一种直观感受，先放出一张原始图片：</p>
<img src="/assets/img/post/imagealign_original.jpg" alt="tower" height="" width="" style="display: block; margin-left: auto; margin-right: auto">
<p>这是没有处理前直接合成的图像：</p>
<img src="/assets/img/post/imagealign_bad.jpg" alt="tower" height="300" width="300" style="display: block; margin-left: auto; margin-right: auto">
<p>这是经过处理后合成的图像:</p>
<img src="/assets/img/post/imagealign_good.jpg" alt="tower" height="300" width="300" style="display: block; margin-left: auto; margin-right: auto">
<br>
<hr>
<p>现在正式开始我的讲座！首先是目录</p>
<ul><a href="#1">1. 分离三个通道</a></ul>
<ul><a href="#2">2. 图像对齐</a></ul>
<ul><a href="#3">3. 边缘裁剪</a></ul>
<ul><a href="#4">4. 色彩校正</a></ul>
<br>
<ul><h4 id="1">分离三个通道</h4> 
这一步我用的最简单的方法，也就是把原图每1/3高度裁剪一次，分别对应蓝、绿、红通道的图像。当然，你可以发现其实这三幅图并不是那么精确地按照1/3的高度排布的，因此更好的方法例如：对边进行扫描，截取非黑边的部分。我的设想是，由于输入图片是黑白，因此只有一个色彩通道，我们可以略微加深对比度，使边缘黑框成为纯黑，然后在图片高度的每隔1/3处向上下扫描，如果遇到超过一定比率的像素块不为黑色，那么就停止扫描并且裁剪。</ul>
<br>
<ul>
	<h4 id="2">图像对齐</h4>
	<ul><h4>基本思路</h4>
		<p>因为三张图片差别并不大，我们只需要以某一个通道的图片为基础，通过搜索找出其他两个通道相对于base通道的最佳匹配点，然后进行合并就好。关键是：如何搜索、如何定义“最佳匹配点”。这里，我们用SSD，也就是 平方差匹配法 来作为评判标准。平方差的计算方法是对应像素点差值的平方。计算两个图片的SSD，也就是求所有像素点平方差的和的平均。然后找到SSD最小的那个位置。</p>
	</ul>
	<ul><h4>暴力方法</h4>
		<p>首先想到的就是，把base图片放在下面，然后让匹配图片从上往下、从左到右一个像素一个像素扫描，计算最佳的匹配点。也就是考虑每个像素作为图像原点的情况。当然，如果想周全，还可以在匹配图片周围增加一些空白区域，让这些空白区域作为原点（这样相当于匹配图像有内容的部分向右下角移动）。可是这样做，必定是十分耗费时间的。如果图片size为m*n，那么这样操作下来需要O((m*n)^2)的复杂度，稍大点的图片就不能接受。</p>
	</ul>
	<ul><h4>高斯金字塔</h4>
		<p>这里我们介绍一个得力助手：高斯金字塔。<a href="/assets/img/post/imagealign_pyramid.png" target="_blank">Opencv</a>对其有官方讲解。它的结构是这样的：</p>
		<br ><img src="/assets/img/post/imagealign_pyramid.png" style="display: block; margin-left: auto; margin-right: auto;"/><br> 
		<p>所以，这个金字塔帮我们做的，就是不断减小图片的规模。具体做法是先高斯平滑，然后去偶数行和偶数列生成下一层，这样一来，每一子层的大小是其父层的1/4。你可以设定最高层的大小，30*30或者16*16就好。即便20000*20000分辨率的图片，也不过只有8,9层。这样一来，我们可以先在最小层上找到最佳匹配点的估计，然后慢慢扩大，逐步逼近，这样就会节省大量的时间。</p>
		<p>具体做法是，在较顶层的时候，我们用较大的搜索范围来搜索最佳匹配点，这样不会浪费多少时间。而且因为高层的图片较小、模糊，所以哪怕全面搜索也是值得的（因为匹配不是很精确）。但随着层次下降，我们就需要相应地减少搜索范围。由于已经知道了上一层的最佳点(x,y)，那么对于当前层，上一层的(x,y)对应这一层的(2x,2y)（根据建立金字塔的规则）。而在金字塔建立的过程中，每四个像素会舍去三个像素，也就是说，上一层最佳匹配点周围会有8个像素是被抛弃的(下图中白格子是下一层被保留的像素，深蓝色是被抛弃的像素,每个白格子周围有8个蓝格子):</p>
		<img src="/assets/img/post/imagealign_pyramid2.png" alt="tower" height="200" width="500" style="display: block; margin-left: auto; margin-right: auto"><br>
		<p>这样一来，由于上一层已经搜索过的点不需要再次搜索，我们只需要在当前层搜索上一层未搜索过的这八个像素点，然后与当前最佳匹配点进行比较就好。</p>
		<p>所以，这样一来，除去最高几层的搜索，其他每层只需要搜索9次，运行起来也是飞快啦。</p>
	</ul>
	<ul><h4>锐化处理</h4>
		<p>为了提高搜索的质量，我们用锐化来使照片里的边缘更加突出，匹配的时候SSD的变化更大。这里我们用Unsharp Mask进行处理（这是Photoshop中的USM锐化功能）。<a href="http://www.cnblogs.com/Imageshop/archive/2013/05/19/3086388.html" target="_blank">具体做法</a>,效果见<a href="https://en.wikipedia.org/wiki/Unsharp_masking" target="_blank">维基</a>。</p>
	</ul><
</ul>
<br>
<ul><h4 id="3">边缘裁剪</h4>
	<ul><h4>问题</h4>
		<p>合并好我们的三通道图像之后，由于对齐把通道平移的缘故，会发现边缘会出现很多彩色条纹：</p>
		<img src="/assets/img/post/imagealign_res1.png" alt="tower" height="300" width="300" style="display: block; margin-left: auto; margin-right: auto"><br>
		<p>如何尽可能消除这些边框，又不伤害原本的内容呢？</p>
	</ul>
	<ul><h4>解决第一步</h4>
		<p>首先我们需要意识到：条纹的产生，主要是因为我们在对齐的时候，由于平移，在一些通道的图像边缘填充了黑色色块。于是很简单的想法就是，只保留平移后有内容的部分。也就是说，裁剪三个通道都有内容部分的重叠区域作为输出。这样一来，边框确实裁剪了不少。</p>
	</ul>
	<ul><h4>解决第二步</h4>
		<p>不过恼人的边框依然存在。查看原图的话，你就会发现每张图片边缘会有黑色的区域。怎么消除它们？我用了一个比较笨的方法：先把图片转为灰度图像（只有一个通道），然后在边缘部分，一行一行地搜索，如果连续三行灰度的标准差大于某一个阈值，则判定这时候已经进入了图片内容的部分，停止搜索并且裁剪。否则就可以假设一直都是彩色边框。</p>
	</ul>
	<p>消除条纹后的结果：</p>
		<img src="/assets/img/post/imagealign_crop.png" alt="tower" height="300" width="300" style="display: block; margin-left: auto; margin-right: auto"><br>
</ul>
<ul><h4 id="3">色彩校正</h4>
	<ul><h4>问题</h4>
		<p>简单叠加生成的图片有些斑驳的感觉，如何让它的色彩更加鲜艳呢？</p>
	</ul>
	<ul><h4>直方图增强对比度</h4>
		<p>我们用一个很简单但是普遍的方法：增加对比度。把原图转化为灰度图，然后生成这个灰度图的直方图。直方图表示的是在0到255的灰度上，像素点的都分布情况。我们取分布为前5%与前95%的像素点所在的灰度，称为g1与g2，然后把它们当做灰度为0和255的点。简言之，就是对中间部分的灰度进行拉伸变换。解一个方程组：a*g1+b=0 and a*g2+b=255,然后对每个像素点k应用new k = a*k+b,就可以增强画面的艳丽感了！其实，Instagram中的一款名叫Lux的滤镜也使用了类似的方法，具体可以看<a href="http://stackoverflow.com/questions/9744255/instagram-lux-effect" target="_blank">这里</a>。</p>
	</ul>
</ul>
<hr>
<p>这次任务大功告成！其实，有不少可以值得钻研的方面：例如如何进行边缘裁剪，我们可以先用特定的<a href="https://en.wikipedia.org/wiki/Canny_edge_detector" target="_blank">Detector</a>进行边缘检测后，用<a href="http://blog.csdn.net/carson2005/article/details/6568414" target="_blank">霍夫变换</a> (维基：<a href="https://en.wikipedia.org/wiki/Hough_transform" target="_blank">Hough transform</a>）找到一条最佳直线，将其定为裁剪线。又或者对于色彩校正，也有一些更为复杂的方法。原谅我只是刚刚涉及，无力去实现那些看不懂的算法:-）。</p>
<p>除了更加复杂的方法之外，还有一些方面可以思考：例如在图像对齐的时候，我们如果考虑旋转、缩放，会产生更好地结果。也即在x\y二维坐标上增加旋转和缩放两个维度，再次进行搜索。虽然时间会变慢，但结果应该不错，值得尝试一下（旋转和缩放的变换都可以通过与一个矩阵相乘来求得，当然用matlab的话会有相应的函数）。</p>
<p>图像对齐其实是计算机视觉一个很专业的领域，这次任务只是一次浅显的尝试。不过能够重现一百多年前的场景，还是很有趣的。</p>

<p>最后附上这位摄影家拍摄的图片数据库：</p>
<p>jpg格式：<a href="http://lcweb2.loc.gov/service/pnp/prok/" target="_blank">http://lcweb2.loc.gov/service/pnp/prok/</a>（注意，以编号+v.jpg格式命名的图片是适合这个任务的图片（最清晰））</p>
<p>tif格式(tif格式非常大，但也更加清晰，可以看到金字塔加速的巨大改善)：<a href="http://lcweb2.loc.gov/master/pnp/prok/" target="_blank">http://lcweb2.loc.gov/master/pnp/prok/</a>（注意，以编号+u.tif格式命名的图片是适合这个任务的图片（最清晰））</p>