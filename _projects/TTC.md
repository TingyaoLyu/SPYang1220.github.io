---
layout: page
permalink: TTC.html
---
<head>
	<link href="../assets/css/drcustom.css" rel="stylesheet" type="text/css">
</head>
<div class="P-page">
<h2 class="P-title">Type, Then Correct: Intelligent Text Correction Techniques for Mobile Text Entry Using Neural Networks</h2>

<!--Overview-->
<h4 class="P-subtitle">Project Overview</h4>
We can rethink the text correction process on mobile phones. Instead of moving the cursor and delete the errors, how about we type the correction first? For this project, we present three novel text correction techniques to improve the correction process: Drag-n-Drop, Drag-n-Throw, and Magic Key. All of the techniques skip error-deletion and cursor-positioning procedures, and instead allow the user to type the correction first, and then apply that correction to a previously committed error. 

Specifically, Drag-n-Drop allows a user to drag a correction and drop it on the error position. Drag-n-Throw lets a user drag a correction from the keyboard suggestion list and “throw” it to the approximate area of the error text, with a neural network determining the most likely error in that area. Magic Key allows a user to type a correction and tap a designated key to highlight possible error candidates, which are also determined by a neural network. The user can navigate among these candidates by directionally dragging from atop the key, and can apply the correction by simply tapping the key.

<ul class="P-list">
<li> 2018.10 - 2019.4</li>
<li>ACE Lab, University of Washington</li>
<li>Mingrui Zhang, He Wen, Jacob O. Wobbrock</li>
<li>Designer, Mobile &#38; Algorithm Developer</li>
</ul>

<h4 class="P-subtitle">Video</h4>
<iframe class="P-iframe" width="560" height="315" src="https://www.youtube.com/embed/87NijB2flSk" frameborder="0" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

<!--Algorithm-->
<h4 class="P-subtitle">Algorithm</h4>
To support Drag-n-Throw and Magic Key, we designed a Recurrent Neural Network (RNN) for error detection. When the raw text and the correction is fed into the network, it will output the corrected version of the text. The network utilizes attention mechanism and a seq-2-seq structure. When a correction action is triggered, the mobile will send the current text in the text editing area to the server, and the server then splits the text into small segments, and do error detection on each segment. The server then returns the best candidate to the mobile application.

<!--Publication-->
<h4 class="P-subtitle">Publication</h4>
Mingrui Ray Zhang, He Wen, and Jacob O. Wobbrock. 2019. Type, Then Correct: Intelligent Text Correction Techniques for Mobile Text Entry Using Neural Networks. In Proceedings of the 32nd Annual ACM Symposium on User Interface Software and Technology (UIST ’19). Association for Computing Machinery, New York, NY, USA, 843–855. <a href="https://faculty.washington.edu/wobbrock/pubs/uist-19.02.pdf" target="_blank">[link]</a>

<!--IMAGES-->
<h4 class="P-subtitle">Images</h4>
<table class="P-galary" border="0" cellspacing="7px" cellpadding="5px" style="margin-left:auto;margin-right:auto;text-align:left">
<tr>
<td><img src="../assets/img/portfolio/ttc.png" align="center"/></td>
</tr>
<tr>
<td>Interaction overview. Drag-n-Drop (a) Drag-n-Throw (b) Magic Key (c)</td>
</tr>

<tr>
<td><img src="../assets/img/research/TTC.png" align="center"/></td>
</tr>
<tr>
<td>Usage demonstration</td>
</tr>
 
<tr>
<td><img src="../assets/img/portfolio/ttc_network1.png" align="center"/></td>
</tr>
<tr>
<td>RNN structure overview.</td>
</tr> 

<tr>
<td><img src="../assets/img/portfolio/ttc_network2.png" align="center"/></td>
</tr>
<tr>
<td>The encoder and decoder of the RNN structure</td>
</tr> 

</table>
</div>

