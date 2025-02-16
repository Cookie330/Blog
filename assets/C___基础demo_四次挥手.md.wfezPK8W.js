import{_ as e,c as a,o as t,a5 as o}from"./chunks/framework.Dvw3FbWD.js";const i="/Blog/assets/image-20240326222939530.Dhw3cXte.png",I=JSON.parse('{"title":"四次挥手","description":"","frontmatter":{},"headers":[],"relativePath":"C++/基础demo/四次挥手.md","filePath":"C++/基础demo/四次挥手.md"}'),s={name:"C++/基础demo/四次挥手.md"},p=o('<h1 id="四次挥手" tabindex="-1">四次挥手 <a class="header-anchor" href="#四次挥手" aria-label="Permalink to &quot;四次挥手&quot;">​</a></h1><p><img src="'+i+'" alt="image"></p><p>由于socket是全双工的工作模式，一个socket的关闭，是需要四次握手来完成的。 主动关闭连接的一方，调用close()；协议层发送FIN包</p><p>被动关闭的一方收到FIN包后，协议层回复ACK；然后被动关闭的一方，进入CLOSE_WAIT状态，主动关闭的一方等待对方关闭，则进入FIN_WAIT_2状态；此时，主动关闭的一方 等待 被动关闭一方的应用程序，调用close操作。</p><p>被动关闭的一方在完成所有数据发送后，调用close()操作；此时，协议层发送FIN包给主动关闭的一方，等待对方的ACK，被动关闭的一方进入LAST_ACK状态；</p><p>主动关闭的一方收到FIN包，协议层回复ACK；此时，主动关闭连接的一方，进入TIME_WAIT状态；而被动关闭的一方，进入CLOSED状态</p><p>等待2MSL时间，如没发现重传的FIN，主动关闭的一方，结束TIME_WAIT，进入CLOSED状态</p><h1 id="time-wait-产生原因-等待2msl意义" tabindex="-1">time_wait 产生原因（等待2MSL意义） <a class="header-anchor" href="#time-wait-产生原因-等待2msl意义" aria-label="Permalink to &quot;time_wait 产生原因（等待2MSL意义）&quot;">​</a></h1><p>假设是客户端向服务端发起断开连接</p><p>为了保证客户端发送的最后一个ACK报文段能够到达服务器。因为这个ACK有可能丢失，从而导致处在LAST-ACK状态的服务器收不到对FIN-ACK的确认报文。服务器会超时重传这个FIN-ACK，接着客户端再重传一次确认，重新启动时间等待计时器。最后客户端和服务器都能正常的关闭。假设客户端不等待2MSL，而是在发送完ACK之后直接释放关闭，一但这个ACK丢失的话，服务器就无法正常的进入关闭连接状态。</p><p>防止“已失效的连接请求报文段”出现在本连接中。</p><p>客户端在发送完最后一个ACK报文段后，再经过2MSL，就可以使本连接持续的时间内所产生的所有报文段都从网络中消失，使下一个新的连接中不会出现这种旧的连接请求报文段。</p><h1 id="time-wait过多产生原因" tabindex="-1">time_wait过多产生原因 <a class="header-anchor" href="#time-wait过多产生原因" aria-label="Permalink to &quot;time_wait过多产生原因&quot;">​</a></h1><p>正常的TCP客户端连接在关闭后，会进入一个TIME_WAIT的状态，持续的时间一般在1-4分钟，对于连接数不高的场景，1-4分钟其实并不长，对系统也不会有什么影响， 但如果短时间内（例如1s内）进行大量的短连接，则可能出现这样一种情况：客户端所在的操作系统的socket端口和文件描述符被用尽，系统无法再发起新的连接！</p><p>举例来说：   假设每秒建立了1000个短连接（Web场景下是很常见的，例如每个请求都去访问memcached），假设TIME_WAIT的时间是1分钟，则1分钟内需要建立6W个短连接，由于TIME_WAIT时间是1分钟，这些短连接1分钟内都处于TIME_WAIT状态，都不会释放，而Linux默认的本地端口范围配置是：net.ipv4.ip_local_port_range = 32768 61000不到3W，因此这种情况下新的请求由于没有本地端口就不能建立了。</p><h1 id="time-wait过多解决方法" tabindex="-1">time_wait过多解决方法 <a class="header-anchor" href="#time-wait过多解决方法" aria-label="Permalink to &quot;time_wait过多解决方法&quot;">​</a></h1><p><b>1.可以改为长连接，但代价较大，长连接太多会导致服务器性能问题并且安全性也较差；</b></p><p><b>2.修改ipv4.ip_local_port_range，增大可用端口范围，但只能缓解问题，不能根本解决问题；</b></p><p><b>3.客户端机器打开tcp_tw_reuse和tcp_timestamps选项；</b></p><p>字面意思，reuse TIME_WAIT状态的连接。时刻记住一条socket连接，就是那个五元组，出现TIME_WAIT状态的连接，一定出现在主动关闭连接的一方。所以，当主动关闭连接的一方，再次向对方发起连接请求的时候（例如，客户端关闭连接，客户端再次连接服务端，此时可以复用了；负载均衡服务器，主动关闭后端的连接，当有新的HTTP请求，负载均衡服务器再次连接后端服务器，此时也可以复用），可以复用TIME_WAIT状态的连接。</p><p>通过字面解释，以及例子说明，你看到了，tcp_tw_reuse应用的场景：某一方，需要不断的通过“短连接”连接其他服务器，总是自己先关闭连接(TIME_WAIT在自己这方)，关闭后又不断的重新连接对方。</p><p>那么，当连接被复用了之后，延迟或者重发的数据包到达，新的连接怎么判断，到达的数据是属于复用后的连接，还是复用前的连接呢？那就需要依赖前面提到的两个时间字段了。复用连接后，这条连接的时间被更新为当前的时间，当延迟的数据达到，延迟数据的时间是小于新连接的时间，所以，内核可以通过时间判断出，延迟的数据可以安全的丢弃掉了。</p><p>这个配置，依赖于连接双方，同时对timestamps的支持。同时，这个配置，仅仅影响outbound连接，即做为客户端的角色，连接服务端[connect(dest_ip, dest_port)]时复用TIME_WAIT的socket。</p><p><b>4.客户端机器打开tcp_tw_recycle和tcp_timestamps选项；</b></p><p>字面意思，销毁掉 TIME_WAIT。</p><p>当开启了这个配置后，内核会快速的回收处于TIME_WAIT状态的socket连接。多快？不再是2MSL，而是一个RTO（retransmission timeout，数据包重传的timeout时间）的时间，这个时间根据RTT动态计算出来，但是远小于2MSL。</p><p>有了这个配置，还是需要保障 丢失重传或者延迟的数据包，不会被新的连接(注意，这里不再是复用了，而是之前处于TIME_WAIT状态的连接已经被destroy掉了，新的连接，刚好是和某一个被destroy掉的连接使用了相同的五元组而已)所错误的接收。在启用该配置，当一个socket连接进入TIME_WAIT状态后，内核里会记录包括该socket连接对应的五元组中的对方IP等在内的一些统计数据，当然也包括从该对方IP所接收到的最近的一次数据包时间。当有新的数据包到达，只要时间晚于内核记录的这个时间，数据包都会被统统的丢掉。</p><p>这个配置，依赖于连接双方对timestamps的支持。同时，这个配置，主要影响到了inbound的连接（对outbound的连接也有影响，但是不是复用），即做为服务端角色，客户端连进来，服务端主动关闭了连接，TIME_WAIT状态的socket处于服务端，服务端快速的回收该状态的连接。</p><h1 id="短连接" tabindex="-1">短连接 <a class="header-anchor" href="#短连接" aria-label="Permalink to &quot;短连接&quot;">​</a></h1><p>连接-&gt;传输数据-&gt;关闭连接 HTTP是无状态的，浏览器和服务器每进行一次HTTP操作，就建立一次连接，但任务结束就中断连接。 也可以这样说：短连接是指SOCKET连接后发送后接收完数据后马上断开连接。</p><h1 id="长连接" tabindex="-1">长连接 <a class="header-anchor" href="#长连接" aria-label="Permalink to &quot;长连接&quot;">​</a></h1><p>连接-&gt;传输数据-&gt;保持连接 -&gt; 传输数据-&gt; 。。。 -&gt;关闭连接。 长连接指建立SOCKET连接后不管是否使用都保持连接，但安全性较差。</p><h1 id="close-wait产生原因" tabindex="-1">close_wait产生原因： <a class="header-anchor" href="#close-wait产生原因" aria-label="Permalink to &quot;close_wait产生原因：&quot;">​</a></h1><p>比如是客户端要与服务端断开连接，先发一个FIN表示自己要主动断开连接了，服务端会先回一个ACK，这时表示客户端没数据要发了，但有可能服务端数据还没发完，所以要经历一个close_wait，等待服务端数据发送完，再回一个FIN和ACK。</p><h1 id="close-wait产生太多原因" tabindex="-1">close_wait产生太多原因： <a class="header-anchor" href="#close-wait产生太多原因" aria-label="Permalink to &quot;close_wait产生太多原因：&quot;">​</a></h1><p>close_wait 按照正常操作的话应该很短暂的一个状态，接收到客户端的fin包并且回复客户端ack之后，会继续发送FIN包告知客户端关闭关闭连接，之后迁移到Last_ACK状态。但是close_wait过多只能说明没有迁移到Last_ACK，也就是服务端是否发送FIN包，只有发送FIN包才会发生迁移，所以问题定位在是否发送FIN包。FIN包的底层实现其实就是调用socket的close方法，这里的问题出在没有执行close方法。说明服务端socket忙于读写。</p><h1 id="close-wait太多解决方法" tabindex="-1">close_wait太多解决方法： <a class="header-anchor" href="#close-wait太多解决方法" aria-label="Permalink to &quot;close_wait太多解决方法：&quot;">​</a></h1><p>代码层面做到 第一：使用完socket就调用close方法； 第二：socket读控制，当读取的长度为0时（读到结尾），立即close； 第三：如果read返回-1，出现错误，检查error返回码，有三种情况：INTR（被中断，可以继续读取），WOULDBLOCK（表示当前socket_fd文件描述符是非阻塞的，但是现在被阻塞了），AGAIN（表示现在没有数据稍后重新读取）。如果不是AGAIN，立即close 可以设置TCP的连接时长keep_alive_time还有tcp监控连接的频率以及连接没有活动多长时间被迫断开连接</p><h1 id="socket连接到底是个什么概念" tabindex="-1">Socket连接到底是个什么概念？ <a class="header-anchor" href="#socket连接到底是个什么概念" aria-label="Permalink to &quot;Socket连接到底是个什么概念？&quot;">​</a></h1><p>经常提socket，那么，到底什么是一个socket？其实，socket就是一个 五元组，包括：</p><p>源IP</p><p>源端口</p><p>目的IP</p><p>目的端口</p><p>类型：TCP or UDP</p><h1 id="什么时候用长连接-短连接" tabindex="-1">什么时候用长连接，短连接？ <a class="header-anchor" href="#什么时候用长连接-短连接" aria-label="Permalink to &quot;什么时候用长连接，短连接？&quot;">​</a></h1><p>长连接多用于操作频繁，点对点的通讯，而且连接数不能太多情况，。每个TCP连接都需要三步握手，这需要时间，如果每个操作都是先连接，再操作的话那么处理速度会降低很多，所以每个操作完后都不断开，次处理时直接发送数据包就OK了，不用建立TCP连接。例如：数据库的连接用长连接， 如果用短连接频繁的通信会造成socket错误，而且频繁的socket 创建也是对资源的浪费。</p><p>而像WEB网站的http服务一般都用短链接，因为长连接对于服务端来说会耗费一定的资源，而像WEB网站这么频繁的成千上万甚至上亿客户端的连接用短连接会更省一些资源，如果用长连接，而且同时有成千上万的用户，如果每个用户都占用一个连接的话，那可想而知吧。所以并发量大，但每个用户无需频繁操作情况下需用短连好。</p><p>总之，长连接和短连接的选择要视情况而定。</p><h1 id="报文发送接收方式-同步和异步" tabindex="-1">报文发送接收方式 （同步和异步）？ <a class="header-anchor" href="#报文发送接收方式-同步和异步" aria-label="Permalink to &quot;报文发送接收方式 （同步和异步）？&quot;">​</a></h1><h2 id="_1、异步" tabindex="-1">1、异步 <a class="header-anchor" href="#_1、异步" aria-label="Permalink to &quot;1、异步&quot;">​</a></h2><p>报文发送和接收是分开的，相互独立的，互不影响。这种方式又分两种情况： (1)异步双工：接收和发送在同一个程序中，由两个不同的子进程分别负责发送和接收 (2)异步单工：接收和发送是用两个不同的程序来完成。</p><h2 id="_2、同步" tabindex="-1">2、同步 <a class="header-anchor" href="#_2、同步" aria-label="Permalink to &quot;2、同步&quot;">​</a></h2><p>报文发送和接收是同步进行，既报文发送后等待接收返回报文。 同步方式一般需要考虑超时问题，即报文发出去后不能无限等待，需要设定超时时间，超过该时间发送方不再等待读返回报文，直接通知超时返回。 在长连接中一般是没有条件能够判断读写什么时候结束，所以必须要加长度报文头。读函数先是读取报文头的长度，再根据这个长度去读相应长度的报文。</p>',54),c=[p];function r(l,_,h,n,d,T){return t(),a("div",null,c)}const u=e(s,[["render",r]]);export{I as __pageData,u as default};
