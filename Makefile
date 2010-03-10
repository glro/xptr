SOURCE_DIR = src
BUILD_DIR = build
VPATH = $(SOURCE_DIR):$(BUILD_DIR)
VERSION=1.0
JAVA=java
YUICOMPRESSOR=/opt/yuicompressor/yuicompressor-2.4.2.jar

all: xpath-${VERSION}.js

xpath-$(VERSION).js: lligen.js xpath.ast.js xpath.base.js xpath.core.js xpath.grammar.js xpath.interpreter.js xpath.js xpath.lexer.js xpath.parser.js xpath.symbol.js xpath.util.js
	mkdir -p ${BUILD_DIR}
	cat $+ > ${BUILD_DIR}/xpath-${VERSION}.js
	${JAVA} -jar ${YUICOMPRESSOR} ${BUILD_DIR}/xpath-${VERSION}.js -o ${BUILD_DIR}/xpath-${VERSION}-min.js

%-min.js: %.js
	${JAVA} -jar ${YUICOMPRESSOR} $< -o ${<:.js=-min.js}

clean:
	rm -rf ./${BUILD_DIR}

.PHONY: clean

