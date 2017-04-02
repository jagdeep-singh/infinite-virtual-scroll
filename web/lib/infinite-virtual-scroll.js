(function (app) {

    function InfiniteVirtualScroll(config) {
        var self = this;
        self.$element = document.getElementById(config.id);
        self.array = config.data || [];
        self.apiServer_cb = typeof config['apiServer_cb'] === 'function' ? config['apiServer_cb'] : null;
        self.scrollOffset = config['scrollOffset'] ? config['scrollOffset'] : 0; // in percentage
        self.positioningProperty = config.direction === 'horizontal' ? 'left' : 'top';
        self.clientSize =  config.direction === 'horizontal' ? 'clientWidth' : 'clientHeight';
        self.scrollPos =  config.direction === 'horizontal' ? 'scrollLeft' : 'scrollTop';
        self.scrollSize =  config.direction === 'horizontal' ? 'scrollWidth' : 'scrollHeight';
        self.$scrollParent = config.scrollParent ? self.$element.closest(config.scrollParent) : self.$element;
        self.$listContainer = config.listContainerId ? document.getElementById(config.listContainerId) : null;
        self.isApiInProcess = false;
        self.maxHeight = 10000000;
        self.lastScrollHeight;
        self.elementSize;
        self.$fillElement;
        self.startIndex = 0;
        self.endIndex = 1;
        self.offsetBefore = config.offsetBefore || 0;
        self.offsetAfter = config.offsetAfter || 0;
        self.excess = config.excess || 0;
        self.onRender = typeof config.onRender === 'function' ? config.onRender : function(){};

        if(!config.render){
            self.tpl = self.$element.children[0].outerHTML;
            self.matches = self.tpl.match(/#.+?#/g);
        }
        self.render = config.render || function (dataItem) {
            var html = self.tpl;
            self.matches.forEach(function(match){
                html = html.replace(match, self.getModelFromMatch(match, dataItem));
            });
            return html;
        };

        self.setInitializeCss();

        if(self.array.length == 0 && self.apiServer_cb)
            self.getApiData();
        else
            self.initVS();
    }

    InfiniteVirtualScroll.prototype = {
        setInitializeCss : function () {
            var self = this;
            if(self.$element.style.position === 'static' || !self.$element.style.position){
                self.$element.style.position = 'relative';
            }
            if(self.$element.style.overflow != 'auto' || !self.$element.style.position){
                self.$element.style.overflow = 'auto';
            }
        },
        stringToHtmlElem : function (htmlStr) {
            var div = document.createElement('tbody');
            div.innerHTML = htmlStr;
            return div.firstChild;
        },
        refresh : function(startIndex, endIndex){
            var self = this;
            if(self.$listContainer)
                self.$listContainer.innerHTML = "";
            else {
                // self.$element.childNodes.forEach(function (childNode) {
                //     if(childNode.className != 'ivs-repeat-fill-element')
                //         self.$element.removeChild(childNode);
                // });
                self.$element.innerHTML = "";
                self.initializeFillElementAndWheelHelper()
            }
            endIndex = Math.min(startIndex + 30, endIndex);

            self.array.slice(startIndex, endIndex).forEach(function(dataItem, index){
                var html = self.render(dataItem);
                var $item;
                if(self.$listContainer) {
                    $item = self.stringToHtmlElem(html);
                    self.$listContainer.appendChild($item);
                }
                else {
                    $item = self.stringToHtmlElem(html);
                    self.$element.appendChild($item);
                }
                $item.setAttribute('data-index', startIndex + index);
                $item.style.position = 'absolute';
                if(self.elementSize != null){
                    if(self.array.length * self.elementSize > self.maxHeight){
                        var actualStartIndex = Math.max(
                            Math.floor(
                                (self.$scrollParent[self.scrollPos] - self.offsetBefore) / self.elementSize + self.excess/2
                            ) - self.excess,
                            0
                        );
                        $item.style[self.positioningProperty] = ((actualStartIndex + index) * self.elementSize + self.offsetBefore) + "px";
                    }
                    else
                        $item.style[self.positioningProperty] = ((startIndex + index) * self.elementSize + self.offsetBefore) + "px";
                    self.onRender($item, dataItem, index, startIndex, endIndex);
                }
                else{
                    self.elementSize = $item.offsetHeight;
                    self.initializeFillElementAndWheelHelper();
                    self.$scrollParent.addEventListener('scroll', function() {
                        self.updateInnerCollection();
                        self.getApiData();
                    });
                }
            });
        },

        createElement : function (htmlStr) {
            if(!htmlStr)
                return;
            var elem = document.createElement("div");
            elem.innerHTML = htmlStr;
            return elem.childNodes[0];
        },

        initializeFillElementAndWheelHelper : function(){
            var self = this;
            var baseHeight = self.array.length * self.elementSize;
            var totalHeight = baseHeight + self.offsetBefore + self.offsetAfter;
            var assignableTotalHeight = totalHeight > this.maxHeight ? this.maxHeight : totalHeight;
            self.$fillElement = self.createElement('<div class="ivs-repeat-fill-element" style="position: relative;min-height: 100%; min-width: 100%;height: '+assignableTotalHeight+'px"></div>');
            self.$element.appendChild(self.$fillElement);
        },
        // onScroll : function() {
        //     // var self = this;
        //     console.log(self);
        //     self.updateInnerCollection();
        //     self.getApiData();
        // },
        getApiData : function() {
            var self = this;
            var scrollPosition = self.$scrollParent[self.scrollPos];
            var sizeOfScroll = self.$scrollParent[self.scrollSize];
            var sizeOfClient = self.$scrollParent[self.clientSize];
            var scrollBottomOffset = sizeOfScroll - (scrollPosition + sizeOfClient);
            var bottomOffsetPercentage = (scrollBottomOffset/sizeOfScroll)*100;
            if(bottomOffsetPercentage <= self.scrollOffset && !self.isApiInProcess && self.apiServer_cb) {
                self.isApiInProcess = true;
                self.apiServer_cb(self.array, self.apiSuccessCb, self.apiFailureCb)
            }
        },
        apiFailureCb : function(){
            var self = this;
            self.isApiInProcess = false;
        },

        updateInnerCollection : function(){
            var self = this;
            if(self.array.length * self.elementSize > self.maxHeight){
                self.handleMaxHeightCase();
                return;
            }

            self.startIndex = Math.max(
                Math.floor(
                    (self.$scrollParent[self.scrollPos] - self.offsetBefore) / self.elementSize + self.excess/2
                ) - self.excess,
                0
            );

            self.endIndex = Math.min(
                self.startIndex + Math.ceil(
                    self.$scrollParent[self.clientSize] / self.elementSize
                ) + self.excess,
                self.array.length
            );
            self.refresh(self.startIndex, self.endIndex);
        },

        apiSuccessCb : function(data) {
            var self = this;
            self.isApiInProcess = false;
            if(data.length == 0 || !data) {
                return;
            }
            if(elementSize)
                self.lastScrollHeight = self.array.length * self.elementSize > self.maxHeight ? self.array.length * self.elementSize : null;
            self.array = self.array.concat(data);
            self.handleScrollBarPosition();
            self.initVS();
            setTimeout(function () {
                self.getApiData();
            }, 0);
        },
        initVS : function() {
            var self = this;
            self.refresh(self.startIndex, self.endIndex);
            setTimeout(function(){
                self.updateInnerCollection();
            });
        },
        handleScrollBarPosition : function() {
            var self = this;
            if(!self.elementSize)
                return;

            if(self.array.length * self.elementSize < self.maxHeight)
                $(self.$scrollParent[0]).children('.vs-repeat-fill-element').css("height", self.array.length * self.elementSize);
            else
                self.setRelativeScrollBarPosition();
        },

        setRelativeScrollBarPosition : function() {
            var self = this;
            var totalHeight = self.array.length * self.elementSize;
            var sizeOfScroll = self.lastScrollHeight || self.$scrollParent[0][self.scrollSize];
            var scrollPosition = self.$scrollParent[0][self.scrollPos];
            var newScrollPos = Math.ceil((sizeOfScroll/totalHeight)*scrollPosition);
            if(totalHeight > self.maxHeight){
                self.$scrollParent[0][self.scrollPos] = newScrollPos;
            }
        },
        // Calculate start & end index when height exceed than the specified.
        handleMaxHeightCase : function() {
            var self = this;
            var totalHeight = self.array.length * self.elementSize;
            var sizeOfScroll = self.$scrollParent[self.scrollSize];
            var sizeOfClient = self.$scrollParent[self.clientSize];
            var scrollPosition = self.$scrollParent[self.scrollPos];

            var newScrollPos = Math.ceil((scrollPosition/(sizeOfScroll-sizeOfClient))*(totalHeight-sizeOfClient));
            self.startIndex =  Math.max(
                Math.floor(
                    (newScrollPos - self.offsetBefore) / self.elementSize + self.excess/2
                ) - self.excess,
                0
            );
            self.endIndex = Math.min(
                self.startIndex + Math.ceil(
                    sizeOfClient / self.elementSize
                ) + self.excess,
                self.array.length
            );
            self.refresh(self.startIndex, self.endIndex);
        },

        getModelFromMatch : function (match, dataItem){
            match = match.substring(1, match.length - 1);
            var props = match.split('.');
            var data = dataItem;
            props.forEach(function(prop){
                data = data[prop];
            });
            return data;
        }
    };

    app.init = function (config) {
        return new InfiniteVirtualScroll(config)
    }

})(window.ivs || (window.ivs = {}));