cover:
	-cp originalContracts/* contracts
	-rm -rf originalContracts
	( cd solcover ; node ./runCoveredTests.js ; cd ..  )
	cat ./solcover/coverage/lcov-report/index.html

install:
	npm install truffle@3.2.1 -g
	git clone http://github.com/JoinColony/solcover.git
	( cd solcover ; npm install )

travis: install cover
