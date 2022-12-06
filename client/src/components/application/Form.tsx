import { Stack } from "@chakra-ui/react";
import { datadogRum } from "@datadog/browser-rum";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { useNetwork } from "wagmi";
import { ValidationError } from "yup";
import {
  submitApplication,
  resetApplicationError,
} from "../../actions/roundApplication";
import { RootState } from "../../reducers";
import {
  AddressType,
  ChangeHandlers,
  DynamicFormInputs,
  Metadata,
  ProjectOption,
  Round,
  RoundApplicationMetadata,
} from "../../types";
import { getProjectURIComponents } from "../../utils/utils";
import { getNetworkIcon, networkPrettyName } from "../../utils/wallet";
import Button, { ButtonVariants } from "../base/Button";
import ErrorModal from "../base/ErrorModal";
import { validateApplication } from "../base/formValidation";
import {
  CustomSelect,
  TextArea,
  TextInput,
  TextInputAddress,
} from "../grants/inputs";
import Radio from "../grants/Radio";
import Toggle from "../grants/Toggle";

const validation = {
  messages: [""],
  valid: false,
  errorCount: 0,
};

enum ValidationStatus {
  Invalid,
  Valid,
}

export default function Form({
  roundApplication,
  round,
  onSubmit,
  showErrorModal,
}: {
  roundApplication: RoundApplicationMetadata;
  round: Round;
  onSubmit: () => void;
  showErrorModal: boolean;
}) {
  const dispatch = useDispatch();
  const { chains } = useNetwork();

  const [formInputs, setFormInputs] = useState<DynamicFormInputs>({});
  const [preview, setPreview] = useState(false);
  const [formValidation, setFormValidation] = useState(validation);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>();
  const [showProjectDetails] = useState(true);
  const [disableSubmit, setDisableSubmit] = useState(false);
  const [selectedProjectID, setSelectedProjectID] = useState<
    string | undefined
  >(undefined);
  const [showError, setShowError] = useState(false);
  const [addressType, setAddressType] = useState<AddressType | undefined>();

  const props = useSelector((state: RootState) => {
    const allProjectMetadata = state.grantsMetadata;
    const { chainID } = state.web3;
    let selectedProjectMetadata: Metadata | undefined;
    if (selectedProjectID !== undefined && selectedProjectID !== "") {
      selectedProjectMetadata =
        allProjectMetadata[Number(selectedProjectID)]?.metadata;
    }

    return {
      projectIDs: state.projects.ids,
      allProjectMetadata,
      selectedProjectMetadata,
      chainID,
    };
  }, shallowEqual);

  const chainInfo = chains.find((i) => i.id === props.chainID);
  const schema = roundApplication.applicationSchema;

  const handleInput = (e: ChangeHandlers) => {
    const { value } = e.target;
    setFormInputs({ ...formInputs, [e.target.name]: value });
  };

  const handleProjectInput = (e: ChangeHandlers) => {
    const { value } = e.target;
    setSelectedProjectID(value);
    handleInput(e);
  };

  const validate = async () => {
    try {
      await validateApplication(schema, formInputs);
      setFormValidation({
        messages: [],
        valid: true,
        errorCount: 0,
      });
      setDisableSubmit(false);
      return ValidationStatus.Valid;
    } catch (e) {
      const error = e as ValidationError;
      datadogRum.addError(error);
      console.log(error);
      setFormValidation({
        messages: error.inner.map((er) => (er as ValidationError).message),
        valid: false,
        errorCount: error.inner.length,
      });
      setDisableSubmit(true);
      return ValidationStatus.Invalid;
    }
  };

  const handlePreviewClick = async () => {
    const valid = await validate();
    if (valid === ValidationStatus.Valid) {
      setPreview(true);
      setShowError(false);
    } else {
      setPreview(false);
      setShowError(true);
    }
  };

  const handleSubmitApplication = async () => {
    if (formValidation.valid) {
      onSubmit();
      dispatch(submitApplication(round.address, formInputs));
    }
  };

  const closeErrorModal = async () => {
    dispatch(resetApplicationError(round.address));
  };

  const handleSubmitApplicationRetry = async () => {
    closeErrorModal();
    handleSubmitApplication();
  };

  // todo: add the chain logo for each project
  useEffect(() => {
    const currentOptions = props.projectIDs.map((id): ProjectOption => {
      const { chainId } = getProjectURIComponents(id);
      const projectChainIconUri = getNetworkIcon(Number(chainId));
      const chainName = networkPrettyName(Number(chainId));
      return {
        id,
        title: props.allProjectMetadata[id]?.metadata?.title,
        chainInfo: {
          chainId: Number(chainId),
          icon: projectChainIconUri,
          chainName,
        },
      };
    });
    currentOptions.unshift({ id: undefined, title: "", chainInfo: undefined });

    setProjectOptions(currentOptions);
  }, [props.allProjectMetadata]);

  return (
    <div className="border-0 sm:border sm:border-solid border-tertiary-text rounded text-primary-text p-0 sm:p-4">
      <form onSubmit={(e) => e.preventDefault()}>
        {schema.map((input) => {
          switch (input.type) {
            case "PROJECT":
              return (
                <>
                  <div className="mt-6 w-full sm:w-1/2 relative">
                    <CustomSelect
                      key={input.id}
                      name={`${input.id}`}
                      label={input.question}
                      options={projectOptions ?? []}
                      disabled={preview}
                      changeHandler={handleProjectInput}
                      required={input.required ?? true}
                    />
                  </div>
                  <div>
                    <Toggle
                      projectMetadata={props.selectedProjectMetadata}
                      showProjectDetails={showProjectDetails}
                    />
                  </div>
                  <div>
                    <p className="text-xs mt-4 mb-1 whitespace-normal sm:w-1/2">
                      To complete your application to {round.roundMetadata.name}
                      , a little more info is needed:
                    </p>
                    <hr className="w-1/2" />
                  </div>
                </>
              );
            case "TEXT":
              return (
                <TextInput
                  key={input.id}
                  label={input.question}
                  placeholder={input.info}
                  name={`${input.id}`}
                  value={formInputs[`${input.id}`] ?? ""}
                  disabled={preview}
                  changeHandler={handleInput}
                  required={input.required ?? false}
                />
              );
            case "RECIPIENT":
              /* Radio for safe or multi-sig */
              return (
                <>
                  <div className="relative mt-2">
                    <Stack>
                      <Radio
                        label="Is your payout wallet a Gnosis Safe or multi-sig?"
                        choices={["Yes", "No"]}
                        changeHandler={handleInput}
                        name="isSafe"
                        value={formInputs.isSafe}
                        info=""
                        required={input.required ?? true}
                        disabled={preview}
                      />
                    </Stack>
                  </div>
                  {/* todo: do we need this tooltip for all networks? */}
                  <TextInputAddress
                    key={input.id}
                    label="Payout Wallet Address"
                    placeholder={input.info}
                    name={`${input.id}`}
                    // eslint-disable-next-line max-len
                    tooltipValue="Please make sure the payout wallet address you provide is a valid address that you own on the network you are applying on."
                    value={formInputs[`${input.id}`]}
                    disabled={preview}
                    changeHandler={handleInput}
                    required={input.required ?? true}
                    onAddressType={(v) => setAddressType(v)}
                    warningHighlight={
                      addressType &&
                      ((formInputs.isSafe === "Yes" &&
                        !addressType.isContract) ||
                        (formInputs.isSafe === "No" && addressType.isContract))
                    }
                  />
                </>
              );
            case "TEXTAREA":
              return (
                <TextArea
                  key={input.id}
                  label={input.question}
                  placeholder={input.info}
                  name={`${input.id}`}
                  value={formInputs[`${input.id}`] ?? ""}
                  disabled={preview}
                  changeHandler={handleInput}
                  required={input.required ?? false}
                />
              );
            case "RADIO":
              return (
                <Radio
                  key={input.id}
                  label={input.question}
                  name={`${input.id}`}
                  value={
                    formInputs[`${input.id}`] ??
                    (input.choices && input.choices[0])
                  }
                  choices={input.choices}
                  disabled={preview}
                  changeHandler={handleInput}
                  required={input.required ?? false}
                />
              );
            // case "MULTIPLE":
            // placeholder until we support multiple input
            //   return (
            //     <Radio
            //       label={appInput.question}
            //       name={id}
            //       info={appInput.info}
            //       choices={appInput.choices}
            //       changeHandler={(e) => console.log(e)}
            //     />
            //   );
            default:
              return (
                <TextInput
                  key={input.id}
                  label={input.question}
                  placeholder={input.info}
                  name={`${input.id}`}
                  value={formInputs[`${input.id}`]}
                  disabled={preview}
                  changeHandler={handleInput}
                  required={input.required ?? false}
                  encrypted={input.encrypted}
                />
              );
          }
        })}
        {addressType &&
          ((formInputs.isSafe === "Yes" && !addressType.isContract) ||
            (formInputs.isSafe === "No" && addressType.isContract)) && (
            <div
              className="flex flex-1 flex-row p-4 rounded bg-gitcoin-yellow mt-8"
              role="alert"
            >
              <div className="text-gitcoin-yellow-500">
                <ExclamationTriangleIcon height={25} width={25} />
              </div>
              <div className="pl-6">
                <strong className="text-gitcoin-yellow-500 font-medium">
                  {formInputs.isSafe === "Yes"
                    ? "Make sure your Gnosis safe or multi-sig is deployed on the current network."
                    : "Review your payout wallet address."}
                </strong>
                <ul className="mt-1 ml-2 text-sm text-black list-disc list-inside">
                  <li className="text-black">
                    {formInputs.isSafe === "Yes" &&
                      (!addressType.isContract || !addressType.isSafe) &&
                      // eslint-disable-next-line max-len
                      `It looks like the payout wallet address you entered may not be a Gnosis Safe or multi-sig that has been deployed on ${chainInfo?.name} network. Make sure your Gnosis Safe or multisig wallet is deployed on the ${chainInfo?.name} network before proceeding. `}
                    {formInputs.isSafe === "No" &&
                      (addressType.isSafe || addressType.isContract) &&
                      // eslint-disable-next-line max-len
                      `It looks like the payout wallet address you have provided is a multi-sig. Please update your selection to indicate your payout wallet address will be a multi-sig, or update your payout wallet address.`}
                  </li>
                </ul>
              </div>
            </div>
          )}
        {!formValidation.valid && showError && formValidation.errorCount > 0 && (
          <div
            className="p-4 text-gitcoin-pink-500 border rounded border-red-900/10 bg-gitcoin-pink-100 mt-8"
            role="alert"
          >
            <strong className="text-sm text-gitcoin-pink-500 font-medium">
              There {formValidation.errorCount === 1 ? "was" : "were"}{" "}
              {formValidation.errorCount}{" "}
              {formValidation.errorCount === 1 ? "error" : "errors"} with your
              form submission
            </strong>
            <ul className="mt-1 ml-2 text-xs text-black list-disc list-inside">
              {formValidation.messages.map((o) => (
                <li className="text-black" key={o}>
                  {o}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-end">
          {!preview ? (
            <Button
              variant={ButtonVariants.primary}
              onClick={() => handlePreviewClick()}
            >
              Preview Application
            </Button>
          ) : (
            <div className="flex justify-end">
              <Button
                variant={ButtonVariants.outline}
                onClick={() => setPreview(false)}
              >
                Back to Editing
              </Button>
              <Button
                variant={ButtonVariants.primary}
                onClick={handleSubmitApplication}
                disabled={disableSubmit}
              >
                Submit
              </Button>
            </div>
          )}
        </div>
      </form>
      <ErrorModal
        open={showErrorModal}
        onClose={closeErrorModal}
        onRetry={handleSubmitApplicationRetry}
      />
    </div>
  );
}
