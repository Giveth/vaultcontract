cover:
	-cp originalContracts/* contracts
	-rm -rf originalContracts
	( cd solcover ; node ./runCoveredTests.js ; cd ..  )
	open ./solcover/coverage/lcov-report/index.html

install:
	yarn
	yarn global add truffle@3.2.1
	git clone http://github.com/adriamb/solcover.git
	( cd solcover ; yarn install )

travis: install
	( cd solcover ; node ./runCoveredTests.js ; cd ..  )
	./node_modules/.bin/codecov
