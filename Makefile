test: npm_modules 
	{ testrpc -d > /tmp/testrpc.log & echo $$! > /tmp/testrpc.pid; }
	-truffle test
	kill `cat /tmp/testrpc.pid`

cover: fulltest
	open ./solcover/coverage/lcov-report/index.html

fulltest: npm_modules solcover
	-cp originalContracts/* contracts
	-rm -rf originalContracts
	( cd solcover ; node ./runCoveredTests.js ; cd ..  )
	eslint test

solcover:
	git clone http://github.com/adriamb/solcover.git
	( cd solcover ; git checkout 7012cda82ee19535ff87d6e6faeb65261b79487a ; npm install )	

npm_modules:
	npm install

install:
	npm install truffle@3.2.1 -g
	npm install eslint@3.19.0 -g
	npm install eslint@3.x babel-eslint@6 eslint-config-airbnb -g

travis: install npm_modules solcover fulltest

.PHONY: test
.PHONY: cover
.PHONY: fulltest
.PHONY: install
.PHONY: travis
