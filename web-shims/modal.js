// Só no site: quem importa o Modal direto (react-native-web/dist/exports/Modal) também recebe o
// Modal do computador (coluna no meio, menu lateral livre). Ver web-shims/react-native.js.
const { DeskModal } = require('./react-native');

module.exports = DeskModal;
module.exports.default = DeskModal;
module.exports.__esModule = true;
