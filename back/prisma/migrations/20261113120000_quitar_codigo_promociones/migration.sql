-- La promoción se identifica por su id: el código que cargaba la propietaria no lo usa ningún flujo.

-- DropIndex
DROP INDEX "UK_promociones_codigo";

-- AlterTable
ALTER TABLE "promociones" DROP COLUMN "codigo";
